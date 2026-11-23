import os
import django
import sys
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.patients.models import Admission
from apps.core.models import PatientUnitAssignment

def main():
    now = timezone.now()
    
    admissions = Admission.objects.exclude(status='discharged')
    count_adm = admissions.update(status='discharged', discharged_at=now)
    
    assignments = PatientUnitAssignment.objects.filter(is_current=True)
    count_assign = assignments.update(is_current=False, discharged_at=now)
    
    print(f"Discharged {count_adm} admissions and completed {count_assign} unit assignments.")

if __name__ == '__main__':
    main()
