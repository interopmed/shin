"""
Seed script: Creates all standard EHR staff users across auth_user and identity_ tables,
along with Service Units, Employees, and Unit Assignments.

Standard roles covered:
  - System Administrator
  - Doctors (assigned to specific units)
  - Nurses (assigned to specific units)
  - Lab Technician (assigned to Lab)
  - Pharmacist (assigned to Pharmacy)
  - Radiologist (assigned to Radiology)
  - Front Desk / Receptionist (assigned to OPD)
  - Billing Officer
  - Auditor / Compliance Officer
  - Medical Records Officer
  - Ward Manager
  - HR Officer

Run:
  python scripts/seed_ehr_users.py
"""

import os
import sys
import django
import uuid

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection
from apps.core.models import IdentityRole, IdentityUser, IdentityUserRole, Employee, ServiceUnit, ServiceUnitStaff

User = get_user_model()

# ─── Service Units ────────────────────────────────────────────────────────
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

# ─── Role & User Definitions ────────────────────────────────────────────────
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
    {
        "role_code": "doctor",
        "role_name": "Doctor",
        "role_description": "Licensed physician.",
        "username": "dr.ahmed.shin.local",
        "email": "dr.ahmed@shin.local",
        "display_name": "Dr. Ahmed",
        "title": "Physician",
        "password": "Doctor@1234",
        "unit": "General Medical Ward",
        "department": "Internal Medicine",
    },
    {
        "role_code": "doctor",
        "role_name": "Doctor",
        "role_description": "Licensed physician.",
        "username": "dr.patel.shin.local",
        "email": "dr.patel@shin.local",
        "display_name": "Dr. Patel",
        "title": "Surgeon",
        "password": "Doctor@1234",
        "unit": "Surgical Ward",
        "department": "Surgery",
    },
    {
        "role_code": "nurse",
        "role_name": "Nurse",
        "role_description": "Bedside care provider.",
        "username": "nurse.priya.shin.local",
        "email": "nurse.priya@shin.local",
        "display_name": "Nurse Priya",
        "title": "Registered Nurse",
        "password": "Nurse@1234",
        "unit": "General Medical Ward",
        "department": "Internal Medicine",
    },
    {
        "role_code": "nurse",
        "role_name": "Nurse",
        "role_description": "Bedside care provider.",
        "username": "nurse.sara.shin.local",
        "email": "nurse.sara@shin.local",
        "display_name": "Nurse Sara",
        "title": "Registered Nurse",
        "password": "Nurse@1234",
        "unit": "Emergency Treatment Unit (ETU)",
        "department": "Emergency",
    },
    {
        "role_code": "lab_technician",
        "role_name": "Lab Technician",
        "role_description": "Processes lab orders.",
        "username": "lab.shin.local",
        "email": "lab@shin.local",
        "display_name": "Sample Lab Technician",
        "title": "Lab Technician",
        "password": "Lab@12345",
        "unit": "Main Laboratory",
    },
    {
        "role_code": "pharmacist",
        "role_name": "Pharmacist",
        "role_description": "Manages medication orders.",
        "username": "pharmacist.shin.local",
        "email": "pharmacist@shin.local",
        "display_name": "Sample Pharmacist",
        "title": "Clinical Pharmacist",
        "password": "Pharma@1234",
        "unit": "Central Pharmacy",
    },
    {
        "role_code": "radiologist",
        "role_name": "Radiologist",
        "role_description": "Interprets imaging studies.",
        "username": "radiology.shin.local",
        "email": "radiology@shin.local",
        "display_name": "Dr. Sample Radiologist",
        "title": "Radiologist",
        "password": "Radio@1234",
        "unit": "Radiology Dept",
    },
    {
        "role_code": "front_desk",
        "role_name": "Front Desk",
        "role_description": "Patient registration.",
        "username": "frontdesk.shin.local",
        "email": "frontdesk@shin.local",
        "display_name": "Sample Receptionist",
        "title": "Front Desk Officer",
        "password": "Desk@12345",
        "unit": "Main OPD",
    },
    {
        "role_code": "billing_officer",
        "role_name": "Billing Officer",
        "role_description": "Manages invoices.",
        "username": "billing.shin.local",
        "email": "billing@shin.local",
        "display_name": "Sample Billing Officer",
        "title": "Billing & Finance Officer",
        "password": "Billing@1234",
    },
    {
        "role_code": "auditor",
        "role_name": "Auditor",
        "role_description": "Read-only access to audit logs.",
        "username": "auditor.shin.local",
        "email": "auditor@shin.local",
        "display_name": "Sample Auditor",
        "title": "Compliance Auditor",
        "password": "Audit@1234",
    },
    {
        "role_code": "medical_records",
        "role_name": "Medical Records Officer",
        "role_description": "Manages health records.",
        "username": "records.shin.local",
        "email": "records@shin.local",
        "display_name": "Sample Records Officer",
        "title": "Medical Records Officer",
        "password": "Records@1234",
    },
    {
        "role_code": "ward_manager",
        "role_name": "Ward Manager",
        "role_description": "Oversees ward operations.",
        "username": "ward.shin.local",
        "email": "ward@shin.local",
        "display_name": "Sample Ward Manager",
        "title": "Ward Manager",
        "password": "Ward@12345",
        "unit": "General Medical Ward",
    },
    {
        "role_code": "hr_officer",
        "role_name": "HR Officer",
        "role_description": "Manages employee records.",
        "username": "hr.shin.local",
        "email": "hr@shin.local",
        "display_name": "Sample HR Officer",
        "title": "Human Resources Officer",
        "password": "Hr@123456",
    },
]


# ─── Helpers ────────────────────────────────────────────────────────────────

def fix_sequences():
    """Reset PostgreSQL sequences to avoid PK conflicts after manual inserts."""
    tables = ['auth_user', 'identity_role', 'identity_user', 'identity_user_role', 'employee', 'service_unit', 'service_unit_staff']
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                    f"coalesce(max(id), 1), true) FROM {table};"
                )
            except Exception as e:
                pass


def seed_user(entry: dict):
    username   = entry['username']
    email      = entry['email']
    password   = entry['password']
    role_code  = entry['role_code']
    role_name  = entry['role_name']
    role_desc  = entry['role_description']
    disp_name  = entry['display_name']
    title      = entry['title']
    unit_name  = entry.get('unit')
    department = entry.get('department', 'General')

    print(f"\n-- {role_name} ({username})")

    # 1. auth_user
    try:
        auth_user = User.objects.get(username=username)
        auth_user.email = email
        auth_user.set_password(password)
        auth_user.save()
        print(f"   auth_user: updated")
    except User.DoesNotExist:
        auth_user = User.objects.create_user(username=username, email=email, password=password)
        print(f"   auth_user: created")

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

    # 4. identity_user_role
    IdentityUserRole.objects.get_or_create(user=ident_user, role=role)

    is_clinical = role_code in ["doctor", "nurse", "lab_technician", "pharmacist", "radiologist"]
    
    # 5. Employee
    employee, emp_created = Employee.objects.get_or_create(
        user=ident_user,
        defaults={
            "code": f"EMP-{uuid.uuid4().hex[:8].upper()}",
            "employee_number": f"EMP-{uuid.uuid4().hex[:8].upper()}",
            "full_name": disp_name,
            "job_title": title,
            "department": department,
            "staff_type": "clinical" if is_clinical else "non_clinical",
        }
    )

    # 6. Service Unit Assignment
    if unit_name:
        unit = ServiceUnit.objects.get(name=unit_name)
        ServiceUnitStaff.objects.get_or_create(
            employee=employee,
            unit=unit,
            defaults={"role": role_name}
        )
        print(f"   Assigned to unit: {unit_name}")


# ─── Entry Point ────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  EHR Staff Seed Script (Service Unit Scoped)")
    print("=" * 60)

    fix_sequences()
    
    print("\nCreating Service Units...")
    for u in UNITS:
        ServiceUnit.objects.get_or_create(name=u["name"], defaults={"unit_type": u["unit_type"], "department": u["department"]})
        print(f"   Unit: {u['name']} ({u['unit_type']})")

    for entry in EHR_STAFF:
        seed_user(entry)

    print("\n" + "=" * 60)
    print("  Seeding complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
