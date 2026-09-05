from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from apps.patients.models import Patient, Admission
from .models import PatientMaterial
from apps.core.serializers import PatientSerializer
from .serializers import PatientMaterialSerializer, AdmissionSerializer
from datetime import datetime

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [AllowAny]


class PatientMaterialViewSet(viewsets.ModelViewSet):
    queryset = PatientMaterial.objects.select_related('patient').all().order_by('-uploaded_at', '-id')
    serializer_class = PatientMaterialSerializer
    permission_classes = [AllowAny]

class PatientCountView(APIView):
    permission_classes = [AllowAny]
    
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
    permission_classes = [AllowAny]

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

from rest_framework.decorators import action
from django.utils import timezone
from rest_framework import status as drf_status

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
