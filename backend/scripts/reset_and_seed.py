"""
Seed script: Resets database (Users, Employees, Patients) and adds dummy data.
"""

import os
import sys
import django
import uuid
import random
from datetime import date, timedelta
from django.utils import timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection
from apps.core.models import IdentityRole, IdentityUser, IdentityUserRole, Employee as CoreEmployee, ServiceUnit, ServiceUnitStaff, Patient
from apps.employees.models import Department, Employee as HREmployee

User = get_user_model()

UNITS = [
    {"name": "General Medical Ward", "unit_type": "ward", "department": "Internal Medicine"},
    {"name": "Surgical Ward", "unit_type": "ward", "department": "Surgery"},
    {"name": "Main ICU", "unit_type": "icu", "department": "Critical Care"},
    {"name": "Emergency Treatment Unit (ETU)", "unit_type": "emergency", "department": "Emergency"},
    {"name": "Main OPD", "unit_type": "opd", "department": "Outpatient"},
    {"name": "Cardiology Clinic", "unit_type": "clinic", "department": "Cardiology"},
    {"name": "Main Laboratory", "unit_type": "lab", "department": "Pathology"},
    {"name": "Radiology Dept", "unit_type": "radiology", "department": "Radiology"},
    {"name": "Central Pharmacy", "unit_type": "pharmacy", "department": "Pharmacy"},
]

EHR_STAFF = [
    {
        "role_code": "system_admin",
        "role_name": "System Administrator",
        "role_description": "Full system access.",
        "username": "admin.shin.local",
        "email": "admin@shin.local",
        "display_name": "System Administrator",
        "title": "System Admin",
        "password": "Admin@1234",
    },
]

try:
    from faker import Faker
    fake = Faker('en_US')
except ImportError:
    print("Faker not installed. Please run: pip install faker")
    sys.exit(1)

def generate_staff():
    # Target: 200 total (including admin). We need 199 more.
    # Rational ratios:
    # Doctors: 40
    # Nurses: 80
    # Lab Technicians: 20
    # Pharmacists: 10
    # Radiologists: 10
    # Front Desk: 29
    # Ward Managers: 10
    
    roles_distribution = [
        ("doctor", "Doctor", "Licensed physician.", "Physician", ["General Medical Ward", "Surgical Ward", "Main ICU", "Emergency Treatment Unit (ETU)", "Cardiology Clinic"], 40),
        ("nurse", "Nurse", "Bedside care provider.", "Registered Nurse", ["General Medical Ward", "Surgical Ward", "Main ICU", "Emergency Treatment Unit (ETU)"], 80),
        ("lab_technician", "Lab Technician", "Processes lab orders.", "Lab Technician", ["Main Laboratory"], 20),
        ("pharmacist", "Pharmacist", "Manages medication orders.", "Clinical Pharmacist", ["Central Pharmacy"], 10),
        ("radiologist", "Radiologist", "Interprets imaging studies.", "Radiologist", ["Radiology Dept"], 10),
        ("front_desk", "Front Desk", "Patient registration.", "Front Desk Officer", ["Main OPD"], 29),
        ("ward_manager", "Ward Manager", "Oversees ward operations.", "Ward Manager", ["General Medical Ward", "Surgical Ward", "Main ICU"], 10),
    ]
    
    generated = []
    
    for r_code, r_name, r_desc, title, possible_units, count in roles_distribution:
        for _ in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            display_name = f"{first_name} {last_name}"
            
            if r_code == "doctor":
                display_name = f"Dr. {first_name} {last_name}"
            elif r_code == "nurse":
                display_name = f"Nurse {first_name} {last_name}"
                
            username = f"{first_name.lower()}.{last_name.lower()}{random.randint(1,99)}@shin.local"
            email = username
            
            unit = random.choice(possible_units)
            # Find department for unit
            dept = "General"
            for u in UNITS:
                if u["name"] == unit:
                    dept = u["department"]
                    break
                    
            generated.append({
                "role_code": r_code,
                "role_name": r_name,
                "role_description": r_desc,
                "username": username,
                "email": email,
                "display_name": display_name,
                "first_name": first_name,
                "last_name": last_name,
                "title": title,
                "password": "Password@123",
                "unit": unit,
                "department": dept
            })
            
    return EHR_STAFF + generated

EHR_STAFF = generate_staff()

def clear_data():
    print("Clearing users, employees, and patients using TRUNCATE CASCADE...")
    with connection.cursor() as cursor:
        cursor.execute("TRUNCATE TABLE auth_user, identity_user, employee, patient, department CASCADE;")

def fix_sequences():
    tables = ['auth_user', 'identity_role', 'identity_user', 'identity_user_role', 'employee', 'service_unit', 'service_unit_staff', 'patient']
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                    f"coalesce(max(id), 1), true) FROM {table};"
                )
            except Exception:
                pass

def seed_user(entry: dict):
    username   = entry['username']
    email      = entry['email']
    password   = entry['password']
    role_code  = entry['role_code']
    role_name  = entry['role_name']
    role_desc  = entry['role_description']
    disp_name  = entry['display_name']
    first_name = entry.get('first_name', disp_name)
    last_name  = entry.get('last_name', '')
    title      = entry['title']
    unit_name  = entry.get('unit')
    dept_name  = entry.get('department', 'General')

    print(f"\n-- {role_name} ({username})")

    # 1. auth_user
    auth_user = User.objects.create_user(username=username, email=email, password=password, first_name=first_name, last_name=last_name)
    
    # 2. identity_role
    role, _ = IdentityRole.objects.get_or_create(
        code=role_code,
        defaults={"name": role_name, "description": role_desc}
    )

    # 3. identity_user
    ident_user, _ = IdentityUser.objects.get_or_create(
        username=username,
        defaults={
            "display_name": disp_name,
            "email": email,
            "title": title,
            "status": "Active",
        }
    )

    IdentityUserRole.objects.get_or_create(user=ident_user, role=role)

    # 4. Department
    dept, _ = Department.objects.get_or_create(name=dept_name, defaults={'description': f'{dept_name} Department'})

    # 5. Core Employee
    emp_code = f"EMP-{uuid.uuid4().hex[:8].upper()}"
    core_emp, _ = CoreEmployee.objects.get_or_create(
        user=ident_user,
        defaults={
            "code": emp_code,
            "employee_number": emp_code,
            "full_name": disp_name,
            "job_title": title,
            "department": dept_name,
        }
    )

    # 6. HR Employee (needs to map to the exact same ID so they link properly!)
    # Actually HR Employee uses OneToOneField to User, and CoreEmployee uses OneToOneField to IdentityUser. 
    # They both have AutoField primary keys. We will force their IDs to match just in case, but they are independent in DB, except serializers might join them. 
    # Wait, `apps.employees.serializers` does: `CoreEmployee.objects.get(id=obj.id)`. So their IDs MUST match!
    from apps.employees.models import Designation
    desig_obj, _ = Designation.objects.get_or_create(name=title)
    
    HREmployee.objects.filter(id=core_emp.id).update(
        user=auth_user,
        department=dept,
        employee_id=emp_code,
        designation=desig_obj,
        date_of_joining=date.today() - timedelta(days=random.randint(100, 1000)),
        created_at=timezone.now()
    )

    # 7. Service Unit Assignment
    if unit_name:
        unit = ServiceUnit.objects.get(name=unit_name)
        ServiceUnitStaff.objects.get_or_create(
            employee=core_emp,
            unit=unit,
            defaults={"role": role_name}
        )
        print(f"   Assigned to unit: {unit_name}")

def seed_patients():
    print("\nCreating Dummy Patients...")
    patients_data = [
        {"name": "John Doe", "email": "john.doe@example.com", "phone": "555-0101", "sex": "Male", "bloodgroup": "O+"},
        {"name": "Jane Smith", "email": "jane.smith@example.com", "phone": "555-0102", "sex": "Female", "bloodgroup": "A-"},
        {"name": "Robert Brown", "email": "robert.brown@example.com", "phone": "555-0103", "sex": "Male", "bloodgroup": "B+"},
        {"name": "Emily Davis", "email": "emily.davis@example.com", "phone": "555-0104", "sex": "Female", "bloodgroup": "AB+"},
        {"name": "Michael Wilson", "email": "michael.wilson@example.com", "phone": "555-0105", "sex": "Male", "bloodgroup": "O-"},
    ]
    for i, p in enumerate(patients_data):
        Patient.objects.create(
            name=p["name"],
            email=p["email"],
            phone=p["phone"],
            sex=p["sex"],
            bloodgroup=p["bloodgroup"],
            patient_id=f"PAT-{1000+i}",
            address="123 Example Street, City",
            birthdate="1980-01-01",
            date=timezone.now().date(),
            created_at=timezone.now(),
            updated_at=timezone.now()
        )
        print(f"   Created Patient: {p['name']}")

def main():
    print("=" * 60)
    print("  Database Reset and Seeding Script")
    print("=" * 60)

    clear_data()
    fix_sequences()
    
    print("\nCreating Service Units...")
    for u in UNITS:
        ServiceUnit.objects.get_or_create(name=u["name"], defaults={"unit_type": u["unit_type"], "department": u["department"]})
        print(f"   Unit: {u['name']} ({u['unit_type']})")

    for entry in EHR_STAFF:
        seed_user(entry)

    seed_patients()

    print("\n" + "=" * 60)
    print("  Seeding complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
