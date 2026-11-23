from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Appointment, Schedule, Holiday
from .serializers import AppointmentSerializer, ScheduleSerializer, HolidaySerializer
from apps.doctors.models import Doctor


def get_request_user_role(request) -> str:
    """Helper to get user's role from token auth payload, identity DB, or user profile."""
    if hasattr(request, 'auth') and isinstance(request.auth, dict):
        role = request.auth.get('user', {}).get('role') or request.auth.get('role')
        if role:
            return str(role)

    if request.user and request.user.is_authenticated:
        try:
            from apps.authentication import get_identity_role
            role = get_identity_role(request.user.username)
            if role:
                return str(role)
        except Exception:
            pass

        if request.user.is_superuser:
            return 'Admin'

    return 'Anonymous'


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'patient', 'doctor', 'date']
    search_fields = ['patient__name', 'doctor__name', 'problem']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        queryset = Appointment.objects.all().select_related('patient', 'doctor')
        role = get_request_user_role(self.request).lower()

        # Nurse, Radiologist, and Ward Manager should NOT see any appointments
        if role in ['nurse', 'user-nurse', 'radiologist', 'user-radiologist', 'ward-manager', 'user-ward', 'ward_manager', 'ward manager']:
            return Appointment.objects.none()

        # Doctor can see only his own channeling appointments
        if role in ['doctor', 'user-doctor']:
            user = self.request.user
            if user and user.is_authenticated:
                # Find matching doctor records linked to this employee/user
                matching_doctors = Doctor.objects.filter(
                    Q(employee__user__username=user.username) |
                    Q(employee__user__email=user.email) |
                    Q(employee__full_name__iexact=user.get_full_name())
                )
                if matching_doctors.exists():
                    doctor_ids = list(matching_doctors.values_list('id', flat=True))
                    return queryset.filter(doctor_id__in=doctor_ids)
                else:
                    # Fallback by matching employee username
                    return queryset.filter(doctor__employee__user__username=user.username)

        return queryset
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's appointments (scoped to role/doctor)"""
        from django.utils import timezone
        today = timezone.now().date()
        appointments = self.filter_queryset(self.get_queryset()).filter(date__date=today)
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming appointments (scoped to role/doctor)"""
        from django.utils import timezone
        now = timezone.now()
        appointments = self.filter_queryset(self.get_queryset()).filter(date__gte=now, status__in=['pending', 'confirmed'])
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)


class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['doctor', 'day', 'is_active']
    ordering_fields = ['day', 'start_time']

    def get_queryset(self):
        queryset = Schedule.objects.all()
        role = get_request_user_role(self.request).lower()

        if role in ['nurse', 'user-nurse']:
            return Schedule.objects.none()

        if role in ['doctor', 'user-doctor']:
            user = self.request.user
            if user and user.is_authenticated:
                matching_doctors = Doctor.objects.filter(
                    Q(employee__user__username=user.username) |
                    Q(employee__user__email=user.email) |
                    Q(employee__full_name__iexact=user.get_full_name())
                )
                if matching_doctors.exists():
                    doctor_ids = list(matching_doctors.values_list('id', flat=True))
                    return queryset.filter(doctor_id__in=doctor_ids)

        return queryset


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['doctor', 'date', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['date']
