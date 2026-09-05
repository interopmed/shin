# rbac.py - Centralized Role-Based Access Control definitions

# Map backend role names to their canonical identifiers
ROLE_MAPPING = {
    "System Administrator": "system-admin",
    "Administrator": "system-admin",
    "Admin": "system-admin",
    "Doctor": "doctor",
    "Nurse": "nurse",
    "Lab Technician": "lab-technician",
    "Laboratorist": "lab-technician",
    "Pharmacist": "pharmacist",
    "Radiologist": "radiologist",
    "Front Desk": "front-desk",
    "Billing Officer": "billing-officer",
    "Auditor": "auditor",
    "Medical Records Officer": "medical-records",
    "Ward Manager": "ward-manager",
    "HR Officer": "hr-officer",
}

# The explicit permissions granted to each role
ROLE_PROFILES = {
    "system-admin": [
        "audit.read", "event.read",
        "staff.read", "staff.write",
        "provider.read",
        "facility.read",
        "module.manage",
        "identity.manage",
        "settings.read", "settings.write",
    ],
    "doctor": [
        "phi.read",
        "patient.read", "patient.write",
        "lab.read", "lab.write", "lab.review",
        "pharmacy.read", "pharmacy.write",
        "imaging.read",
        "scheduling.read",
        "records.read",
        "ward.read",
        "provider.read",
    ],
    "nurse": [
        "phi.read",
        "patient.read", "patient.write",
        "pharmacy.read",
        "scheduling.read",
        "ward.read",
        "provider.read",
    ],
    "lab-technician": [
        "patient.read",
        "lab.read", "lab.write", "lab.review",
    ],
    "pharmacist": [
        "phi.read",
        "patient.read",
        "pharmacy.read", "pharmacy.write",
        "provider.read",
    ],
    "radiologist": [
        "phi.read",
        "patient.read",
        "imaging.read",
        "scheduling.read",
        "provider.read",
    ],
    "front-desk": [
        "patient.read", "patient.write",
        "scheduling.read", "scheduling.write",
        "provider.read",
    ],
    "billing-officer": [
        "patient.read",
        "billing.read", "billing.write",
    ],
    "auditor": [
        "audit.read",
        "event.read",
    ],
    "medical-records": [
        "phi.read",
        "patient.read",
        "records.read", "records.write",
        "lab.read",
        "imaging.read",
        "provider.read",
    ],
    "ward-manager": [
        "phi.read",
        "patient.read",
        "ward.read", "ward.manage",
        "scheduling.read", "scheduling.write",
        "staff.read",
        "provider.read",
        "facility.read",
    ],
    "hr-officer": [
        "staff.read", "staff.write",
    ],
}

def get_permissions_for_role(backend_role: str) -> list[str]:
    """Returns the list of permissions for a given backend role string."""
    profile_key = ROLE_MAPPING.get(backend_role, "front-desk")
    return ROLE_PROFILES.get(profile_key, [])
