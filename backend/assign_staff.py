import os
import django
import sys
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Employee, Facility, ServiceUnit, ServiceUnitStaff, IdentityUser

def main():
    email = 'george.james90@shin.local'
    user = IdentityUser.objects.filter(username=email).first()
    if not user:
        user = IdentityUser.objects.create(
            user_id=str(uuid.uuid4()),
            username=email, 
            display_name='Dr. George James',
            role='doctor',
            is_active=True
        )
        print(f"Created IdentityUser {email}")

    emp, created = Employee.objects.get_or_create(user=user, defaults={
        'code': 'EMP-GJ-' + str(uuid.uuid4())[:8],
        'employee_number': 'EMP-' + str(uuid.uuid4())[:8],
        'full_name': 'Dr. George James',
        'job_title': 'Attending Physician',
        'staff_type': 'clinical',
        'employment_type': 'full_time',
        'department': 'Medicine',
        'facility': 'Kandy Hospital'
    })
    
    fac, created = Facility.objects.get_or_create(name='Kandy Hospital', defaults={
        'type': 'Hospital'
    })
    
    unit, created = ServiceUnit.objects.get_or_create(name='Ward 29 Medical Unit', facility=fac, defaults={
        'unit_type': 'ward'
    })
    
    su_staff, created = ServiceUnitStaff.objects.update_or_create(
        employee=emp, 
        unit=unit, 
        defaults={'is_primary': True, 'role': 'doctor'}
    )
    
    print(f"Assigned {email} to {unit.name} at {fac.name}")

if __name__ == '__main__':
    main()
