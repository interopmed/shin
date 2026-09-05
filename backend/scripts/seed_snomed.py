import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from apps.core.models import TerminologyConcept

# SNOMED CT Codes for Departments
departments = [
    ("394592004", "Clinical oncology"),
    ("394579002", "Cardiology"),
    ("394582007", "Dermatology"),
    ("394583002", "Endocrinology"),
    ("394584008", "Gastroenterology"),
    ("394802001", "General medicine"),
    ("394808002", "General surgery"),
    ("394589003", "Nephrology"),
    ("394591006", "Neurology"),
    ("394577000", "Pediatrics"),
]

# SNOMED CT Codes for Unit Types
unit_types = [
    ("225746001", "Ward (environment)"),
    ("309904001", "Intensive care unit"),
    ("225732001", "Accident and emergency department"),
    ("225728007", "Outpatient department"),
    ("394812008", "Dental clinic"),
    ("225744003", "Operating theater"),
    ("225733006", "Radiology department"),
    ("225738002", "Pharmacy department"),
    ("225735004", "Pathology laboratory"),
]

for code, display in departments:
    TerminologyConcept.objects.get_or_create(
        category="department",
        code=code,
        defaults={"display": display, "system": "http://snomed.info/sct"}
    )

for code, display in unit_types:
    TerminologyConcept.objects.get_or_create(
        category="unit_type",
        code=code,
        defaults={"display": display, "system": "http://snomed.info/sct"}
    )

print("Terminology seeded successfully.")
