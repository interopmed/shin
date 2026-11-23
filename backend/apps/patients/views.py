from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.decorators import action
from rest_framework import status as drf_status
from django.db.models import Q
from django.utils import timezone
from apps.patients.models import Patient, Admission, ImagingRequest, PatientMaterial
from apps.core.serializers import PatientSerializer
from .serializers import PatientMaterialSerializer, AdmissionSerializer, ImagingRequestSerializer
from datetime import datetime
from apps.core.rbac import get_permissions_for_role
from apps.authentication import get_identity_role


class HasPatientReadPermission(BasePermission):
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            if request.user.is_superuser:
                return True
            role = get_identity_role(request.user.username)
            perms = get_permissions_for_role(role or "User")
            if "patient.read" not in perms:
                return False
        return True


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [HasPatientReadPermission]

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = str(self.kwargs.get(lookup_url_kwarg, '')).strip()

        # 1. Try numeric primary key
        if lookup_value.isdigit():
            obj = Patient.objects.filter(pk=int(lookup_value)).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj

        # 2. Try by patient_id code or user_id
        obj = Patient.objects.filter(
            Q(patient_id=lookup_value) | Q(user_id=lookup_value)
        ).first()
        if obj:
            self.check_object_permissions(self.request, obj)
            return obj

        return super().get_object()


class PatientMaterialViewSet(viewsets.ModelViewSet):
    queryset = PatientMaterial.objects.select_related('patient').all().order_by('-uploaded_at', '-id')
    serializer_class = PatientMaterialSerializer
    permission_classes = [HasPatientReadPermission]

class PatientCountView(APIView):
    permission_classes = [HasPatientReadPermission]
    
    def get(self, request):
        date_param = request.query_params.get('date')
        
        if date_param:
            try:
                # Filter by date if provided
                target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                count = Patient.objects.filter(created_at__date=target_date).count()
            except ValueError:
                count = Patient.objects.count()
        else:
            count = Patient.objects.count()
        
        return Response({'count': count})


class PatientSearchView(APIView):
    permission_classes = [HasPatientReadPermission]

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        limit = request.query_params.get('limit', '20')

        try:
            limit_value = max(1, min(int(limit), 50))
        except (TypeError, ValueError):
            limit_value = 20

        if len(query) < 2:
            return Response([])

        patients = (
            Patient.objects.filter(
                Q(name__icontains=query) |
                Q(patient_id__icontains=query)
            )
            .only('id', 'name', 'patient_id')
            .order_by('name', 'id')[:limit_value]
        )

        data = [
            {
                'id': patient.id,
                'name': patient.name,
                'patient_id': patient.patient_id,
            }
            for patient in patients
        ]

        return Response(data)


class AdmissionViewSet(viewsets.ModelViewSet):
    # Only return active admissions
    queryset = Admission.objects.select_related('patient').filter(status='admitted').order_by('-created_at', '-id')
    serializer_class = AdmissionSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=['post'])
    def discharge(self, request, pk=None):
        admission = self.get_object()
        admission.status = 'discharged'
        admission.discharged_at = timezone.now()
        admission.save()
        return Response({'status': 'Patient discharged'})


class ImagingRequestViewSet(viewsets.ModelViewSet):
    queryset = ImagingRequest.objects.select_related('patient').all().order_by('-requested_at', '-id')
    serializer_class = ImagingRequestSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = ImagingRequest.objects.select_related('patient').all().order_by('-requested_at', '-id')
        status_param = self.request.query_params.get('status')
        type_param = self.request.query_params.get('type')
        modality = self.request.query_params.get('modality')
        priority = self.request.query_params.get('priority')
        q = self.request.query_params.get('q')

        if type_param == 'requested':
            qs = qs.filter(status__in=['pending', 'in-progress', 'requested'])
        elif type_param == 'completed':
            qs = qs.filter(status='completed')
        elif status_param:
            qs = qs.filter(status__iexact=status_param)

        if modality and modality.lower() != 'all':
            qs = qs.filter(modality__iexact=modality)

        if priority and priority.lower() != 'all':
            qs = qs.filter(priority__iexact=priority)

        if q:
            q = q.strip()
            qs = qs.filter(
                Q(patient__name__icontains=q) |
                Q(patient__patient_id__icontains=q) |
                Q(modality__icontains=q) |
                Q(body_part__icontains=q) |
                Q(accession_number__icontains=q) |
                Q(clinical_indication__icontains=q)
            )

        return qs

    @action(detail=True, methods=['post', 'patch'])
    def complete_study(self, request, pk=None):
        study = self.get_object()
        data = request.data
        study.status = 'completed'
        study.findings = data.get('findings', study.findings or '')
        study.impression = data.get('impression', study.impression or '')
        study.radiologist_name = data.get('radiologist_name', study.radiologist_name or 'Dr. S. Jayasuriya (Consultant Radiologist)')
        study.notes = data.get('notes', study.notes or '')
        study.completed_at = timezone.now()
        study.save()
        serializer = self.get_serializer(study)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start_scan(self, request, pk=None):
        study = self.get_object()
        study.status = 'in-progress'
        study.save()
        serializer = self.get_serializer(study)
        return Response(serializer.data)

