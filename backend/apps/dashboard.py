from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.appointment.models import Appointment
from apps.lab.models import Lab
from apps.stocks.models import Stock


class DashboardStatsView(APIView):
    """
    Get dashboard statistics
    GET /api/dashboard/stats/
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        patient_count = Patient.objects.count()
        doctor_count = Doctor.objects.count()
        appointment_count = Appointment.objects.count()
        lab_count = Lab.objects.count()
        medicine_count = Stock.objects.count()

        return Response({
            'patients': patient_count,
            'doctors': doctor_count,
            'appointments': appointment_count,
            'lab_tests': lab_count,
            'medicines': medicine_count,
        })
