from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
  Doctor,
  Employee,
  IdentityGroup,
  IdentityPermission,
  IdentityRole,
  IdentityRolePermission,
  IdentityUser,
  IdentityUserGroup,
  IdentityUserRole,
  Patient,
  PatientConsentPreference,
  ProviderOrganization,
  ProviderPerson,
  SystemSetting,
)
from .serializers import DoctorSerializer, PatientConsentPreferenceSerializer, PatientSerializer


DEFAULT_CONSENT_PREFERENCES = (
  {
    "category": "Clinical Notes",
    "group_name": "Attending Physicians",
    "grant_access": True,
    "limit_access": "Restrictive",
    "details": "Care team access to encounter summaries and notes.",
  },
  {
    "category": "Lab Results",
    "group_name": "Specialist referrals",
    "grant_access": True,
    "limit_access": "Restrictive",
    "details": "Lab and pathology visibility for approved providers.",
  },
  {
    "category": "Medications",
    "group_name": "Pharmacists",
    "grant_access": True,
    "limit_access": "Restrictive",
    "details": "Medication profile sharing for dispensing and reconciliation.",
  },
  {
    "category": "Financial Records",
    "group_name": "Billing Dept.",
    "grant_access": True,
    "limit_access": "Restrictive",
    "details": "Billing and payment access for authorized staff.",
  },
  {
    "category": "System-Wide Data Sharing",
    "group_name": "Care Network",
    "grant_access": True,
    "limit_access": "Standard",
    "details": "System-wide records visibility for approved care users.",
  },
  {
    "category": "Research Study Participation",
    "group_name": "Research Office",
    "grant_access": False,
    "limit_access": "Restrictive",
    "details": "Opt-in for de-identified research access requests.",
  },
)

DEFAULT_IDENTITY_ROLES = (
  {"code": "administrator", "name": "Administrator", "scope": "system", "description": "Full administrative access across SHIN."},
  {"code": "clinical-team", "name": "Clinical Team", "scope": "care", "description": "Clinical review, patient chart, and care coordination access."},
  {"code": "lab-manager", "name": "Lab Manager", "scope": "lab", "description": "Laboratory workflows, provider review, and results handling."},
  {"code": "front-desk", "name": "Front Desk", "scope": "operations", "description": "Registration, check-in, and appointment coordination."},
  {"code": "auditor", "name": "Auditor", "scope": "governance", "description": "Read-only compliance and audit visibility."},
)

DEFAULT_IDENTITY_GROUPS = (
  {"code": "clinical-security", "name": "Clinical Security Group", "description": "Clinical staff working set."},
  {"code": "lab-security", "name": "Lab Security Group", "description": "Laboratory staff and review queue."},
  {"code": "admin-security", "name": "Admin Security Group", "description": "Administrative and configuration access."},
  {"code": "records-security", "name": "Records Security Group", "description": "Records, audit, and compliance access."},
)

DEFAULT_IDENTITY_PERMISSIONS = (
  {"code": "patient.read", "module": "patient", "description": "View patient records."},
  {"code": "patient.write", "module": "patient", "description": "Create and update patient records."},
  {"code": "provider.read", "module": "provider", "description": "View provider registry."},
  {"code": "lab.read", "module": "lab", "description": "View laboratory records."},
  {"code": "lab.write", "module": "lab", "description": "Create or update laboratory records."},
  {"code": "audit.read", "module": "governance", "description": "View audit log entries."},
  {"code": "module.manage", "module": "core", "description": "Install, enable, and disable modules."},
  {"code": "identity.manage", "module": "core", "description": "Manage users, groups, and roles."},
)

DEFAULT_IDENTITY_ROLE_PERMISSIONS = {
  "administrator": ["patient.read", "patient.write", "provider.read", "lab.read", "lab.write", "audit.read", "module.manage", "identity.manage"],
  "clinical-team": ["patient.read", "provider.read", "lab.read"],
  "lab-manager": ["patient.read", "provider.read", "lab.read", "lab.write"],
  "front-desk": ["patient.read", "provider.read"],
  "auditor": ["audit.read", "provider.read"],
}

DEFAULT_IDENTITY_USERS = (
  {"username": "admin.shin.local", "display_name": "System Administrator", "email": "admin@shin.local", "title": "Administration", "status": "Active", "mfa_enabled": True, "is_external": False, "role_code": "administrator", "group_code": "admin-security"},
  {"username": "clinical.shin.local", "display_name": "Clinical Team Lead", "email": "clinical@shin.local", "title": "Clinical", "status": "Active", "mfa_enabled": True, "is_external": False, "role_code": "clinical-team", "group_code": "clinical-security"},
  {"username": "lab.shin.local", "display_name": "Lab Manager", "email": "lab@shin.local", "title": "Laboratory", "status": "Active", "mfa_enabled": True, "is_external": False, "role_code": "lab-manager", "group_code": "lab-security"},
  {"username": "frontdesk.shin.local", "display_name": "Front Desk", "email": "frontdesk@shin.local", "title": "Operations", "status": "Active", "mfa_enabled": False, "is_external": False, "role_code": "front-desk", "group_code": "records-security"},
  {"username": "auditor.shin.local", "display_name": "Audit Reviewer", "email": "audit@shin.local", "title": "Governance", "status": "Active", "mfa_enabled": True, "is_external": False, "role_code": "auditor", "group_code": "records-security"},
)

DEFAULT_EMPLOYEES = (
  {"code": "emp-admin-001", "employee_number": "EMP-0001", "full_name": "System Administrator", "job_title": "Administration Lead", "staff_type": "non_clinical", "employment_type": "full_time", "department": "Administration", "facility": "Core", "username": "admin.shin.local"},
  {"code": "emp-clinical-001", "employee_number": "EMP-0002", "full_name": "Clinical Team Lead", "job_title": "Clinical Lead", "staff_type": "clinical", "employment_type": "full_time", "department": "Clinical", "facility": "Core", "username": "clinical.shin.local"},
  {"code": "emp-lab-001", "employee_number": "EMP-0003", "full_name": "Lab Manager", "job_title": "Laboratory Manager", "staff_type": "clinical", "employment_type": "full_time", "department": "Laboratory", "facility": "Core", "username": "lab.shin.local"},
  {"code": "emp-front-001", "employee_number": "EMP-0004", "full_name": "Front Desk", "job_title": "Registration Officer", "staff_type": "non_clinical", "employment_type": "full_time", "department": "Registration", "facility": "Core", "username": "frontdesk.shin.local"},
  {"code": "emp-audit-001", "employee_number": "EMP-0005", "full_name": "Audit Reviewer", "job_title": "Compliance Analyst", "staff_type": "non_clinical", "employment_type": "part_time", "department": "Audit", "facility": "Core", "username": "auditor.shin.local"},
)

DEFAULT_PROVIDER_ORGANIZATIONS = (
  {"code": "bibila-hospital", "name": "BIBILA HOSPITAL", "provider_kind": "external", "organization_type": "hospital"},
  {"code": "pgh-badulla", "name": "P.G.H.BADULLA", "provider_kind": "external", "organization_type": "hospital"},
  {"code": "mahiyanganaya-moh", "name": "MOH MAHIYANGANAYA", "provider_kind": "external", "organization_type": "institute"},
)

DEFAULT_SYSTEM_SETTINGS = (
  {"section": "Global Configuration", "key": "timezone.default", "label": "Default Timezone", "value": "Asia/Colombo", "detail": "Primary node time zone used across records and timestamps.", "kind": "text", "tone": "default", "sort_order": 10, "is_editable": True},
  {"section": "Global Configuration", "key": "language.default", "label": "Platform Language", "value": "English", "detail": "Default interface language for the workspace.", "kind": "text", "tone": "default", "sort_order": 20, "is_editable": True},
  {"section": "Global Configuration", "key": "retention.audit", "label": "System Logs Data Retention Policy", "value": "3 years", "detail": "Audit and system logs are retained for compliance review.", "kind": "text", "tone": "default", "sort_order": 30, "is_editable": True},
  {"section": "Authentication & IAM", "key": "iam.mfa.enforced", "label": "Global MFA Enforcement", "value": "true", "detail": "Require MFA for all high-risk and admin roles.", "kind": "boolean", "tone": "success", "sort_order": 10, "is_editable": True},
  {"section": "Authentication & IAM", "key": "iam.biometric.policy", "label": "Biometric Login Policies", "value": "Configured", "detail": "Biometric sign-in is enabled where device support exists.", "kind": "text", "tone": "default", "sort_order": 20, "is_editable": True},
  {"section": "Authentication & IAM", "key": "iam.role.matrix", "label": "User Role Management matrix", "value": "Live", "detail": "Role assignments follow the identity work registry.", "kind": "text", "tone": "default", "sort_order": 30, "is_editable": False},
  {"section": "Authentication & IAM", "key": "iam.group.matrix", "label": "User Group Management matrix", "value": "Live", "detail": "Groups are synchronized with the staff and identity tables.", "kind": "text", "tone": "default", "sort_order": 40, "is_editable": False},
  {"section": "API & Webhooks", "key": "api.feeds.status", "label": "Connected External Feeds", "value": "3 connected", "detail": "HL7, FHIR, and node callback feeds are registered.", "kind": "text", "tone": "default", "sort_order": 10, "is_editable": False},
  {"section": "API & Webhooks", "key": "api.callbacks.enabled", "label": "System Callbacks", "value": "Enabled", "detail": "Module and event callbacks can publish to downstream systems.", "kind": "boolean", "tone": "success", "sort_order": 20, "is_editable": True},
  {"section": "External Data Feeds", "key": "feeds.epic", "label": "Epic Node 2", "value": "Connected", "detail": "Primary enterprise feed for external hospital connectivity.", "kind": "text", "tone": "success", "sort_order": 10, "is_editable": False},
  {"section": "External Data Feeds", "key": "feeds.hl7", "label": "HL7 v2.5 Feed", "value": "Connected", "detail": "Inbound message feed for clinical and lab events.", "kind": "text", "tone": "success", "sort_order": 20, "is_editable": False},
  {"section": "External Data Feeds", "key": "feeds.fhir", "label": "FHIR Server", "value": "Connected", "detail": "FHIR interoperability channel for structured records.", "kind": "text", "tone": "success", "sort_order": 30, "is_editable": False},
  {"section": "Module Integration", "key": "modules.integration", "label": "Module Management", "value": "Managed by installed module registry", "detail": "Uses installed module manifests and setup checklist logic from module contributions.", "kind": "text", "tone": "default", "sort_order": 10, "is_editable": False},
  {"section": "Module Integration", "key": "modules.extensions", "label": "Available Extensions", "value": "Marketplace ready", "detail": "Approved modules are surfaced from the local module registry.", "kind": "text", "tone": "default", "sort_order": 20, "is_editable": False},
  {"section": "Module Integration", "key": "modules.lab.feed", "label": "Lab/LIS Module Feed", "value": "Active", "detail": "Lab module order and result workflows follow the installed module package.", "kind": "text", "tone": "success", "sort_order": 30, "is_editable": False},
  {"section": "Global Audit & Provenance", "key": "audit.log.summary", "label": "Global Security Audit Logs", "value": "Available", "detail": "Audit trails are retained for clinical, admin, and lab review.", "kind": "text", "tone": "default", "sort_order": 10, "is_editable": False},
  {"section": "Data Privacy & Consent", "key": "privacy.consent.default", "label": "Consent-by-Default", "value": "Opt-In", "detail": "Patient privacy rules default to opt-in sharing controls.", "kind": "choice", "tone": "default", "sort_order": 10, "is_editable": True},
  {"section": "Data Privacy & Consent", "key": "privacy.access.preferences", "label": "PHI Access Preferences", "value": "Set individual privacy rules", "detail": "Fine-grained access rules can be updated from patient consent records.", "kind": "text", "tone": "default", "sort_order": 20, "is_editable": True},
  {"section": "System Backup & Recovery", "key": "backup.status", "label": "Backup Status", "value": "Successful", "detail": "Last backup completed without errors.", "kind": "text", "tone": "success", "sort_order": 10, "is_editable": False},
  {"section": "System Backup & Recovery", "key": "backup.schedule", "label": "Backup Schedule", "value": "Nightly", "detail": "Scheduled backup policy for the SHIN node database.", "kind": "text", "tone": "default", "sort_order": 20, "is_editable": True},
)


def _date_label(value) -> str:
  if not value:
    return "Not recorded"

  if isinstance(value, datetime):
    if timezone.is_aware(value):
      value = timezone.localtime(value)
    return f"{value.strftime('%b')} {value.day}, {value.year}"

  return str(value)


def _clean(value: str | None, fallback: str = "Not recorded") -> str:
  return value.strip() if isinstance(value, str) and value.strip() else fallback


def _confidence(row: Patient) -> int:
  score = 58
  if _clean(row.name, ""):
    score += 12
  if _clean(row.patient_id, ""):
    score += 10
  if _clean(row.birthdate, "") or _clean(row.ebirthdate, ""):
    score += 10
  if _clean(row.sex, ""):
    score += 5
  if _clean(row.address, ""):
    score += 5
  if _clean(row.phone, ""):
    score += 3
  if _clean(row.email, ""):
    score += 3
  if row.assigned_doctor_id:
    score += 8
  return max(45, min(99, score))


def _tone(confidence: int) -> str:
  if confidence >= 90:
    return "verify"
  if confidence >= 75:
    return "match"
  return "conflict"


def _action(tone: str) -> str:
  if tone == "verify":
    return "View Profile / Verify"
  if tone == "match":
    return "Review Match"
  return "Resolve Conflicts"


def _ensure_consent_preferences(patient: Patient) -> list[PatientConsentPreference]:
  existing = {
    (item.category, item.group_name)
    for item in PatientConsentPreference.objects.filter(patient=patient).only("category", "group_name")
  }
  missing = [
    PatientConsentPreference(
      patient=patient,
      category=item["category"],
      group_name=item["group_name"],
      grant_access=item["grant_access"],
      limit_access=item["limit_access"],
      details=item["details"],
    )
    for item in DEFAULT_CONSENT_PREFERENCES
    if (item["category"], item["group_name"]) not in existing
  ]

  if missing:
    PatientConsentPreference.objects.bulk_create(missing, ignore_conflicts=True)

  return list(PatientConsentPreference.objects.filter(patient=patient).order_by("category", "group_name"))


def _ensure_identity_seed() -> None:
  role_objects = {
    item["code"]: IdentityRole(**item)
    for item in DEFAULT_IDENTITY_ROLES
  }
  if not IdentityRole.objects.exists():
    IdentityRole.objects.bulk_create(role_objects.values(), ignore_conflicts=True)

  group_objects = {
    item["code"]: IdentityGroup(**item)
    for item in DEFAULT_IDENTITY_GROUPS
  }
  if not IdentityGroup.objects.exists():
    IdentityGroup.objects.bulk_create(group_objects.values(), ignore_conflicts=True)

  permission_objects = {
    item["code"]: IdentityPermission(**item)
    for item in DEFAULT_IDENTITY_PERMISSIONS
  }
  if not IdentityPermission.objects.exists():
    IdentityPermission.objects.bulk_create(permission_objects.values(), ignore_conflicts=True)

  roles = {role.code: role for role in IdentityRole.objects.all()}
  groups = {group.code: group for group in IdentityGroup.objects.all()}
  permissions = {permission.code: permission for permission in IdentityPermission.objects.all()}

  role_permission_rows = []
  for role_code, permission_codes in DEFAULT_IDENTITY_ROLE_PERMISSIONS.items():
    role = roles.get(role_code)
    if not role:
      continue
    for permission_code in permission_codes:
      permission = permissions.get(permission_code)
      if permission:
        role_permission_rows.append(IdentityRolePermission(role=role, permission=permission))

  IdentityRolePermission.objects.bulk_create(role_permission_rows, ignore_conflicts=True)

  for item in DEFAULT_IDENTITY_USERS:
    role = roles.get(item["role_code"])
    group = groups.get(item["group_code"])
    user, _ = IdentityUser.objects.get_or_create(
      username=item["username"],
      defaults={
        "display_name": item["display_name"],
        "email": item["email"],
        "title": item["title"],
        "status": item["status"],
        "mfa_enabled": item["mfa_enabled"],
        "is_external": item["is_external"],
      },
    )
    user.display_name = item["display_name"]
    user.email = item["email"]
    user.title = item["title"]
    user.status = item["status"]
    user.mfa_enabled = item["mfa_enabled"]
    user.is_external = item["is_external"]
    user.save(update_fields=["display_name", "email", "title", "status", "mfa_enabled", "is_external", "updated_at"])
    if role:
      IdentityUserRole.objects.get_or_create(user=user, role=role)
    if group:
      IdentityUserGroup.objects.get_or_create(user=user, group=group)

  organizations = {}
  for item in DEFAULT_PROVIDER_ORGANIZATIONS:
    organization, _ = ProviderOrganization.objects.get_or_create(
      code=item["code"],
      defaults=item,
    )
    organization.name = item["name"]
    organization.provider_kind = item["provider_kind"]
    organization.organization_type = item["organization_type"]
    organization.is_active = True
    organization.save(update_fields=["name", "provider_kind", "organization_type", "is_active", "updated_at"])
    organizations[item["code"]] = organization

  if organizations and not ProviderPerson.objects.exists():
    ProviderPerson.objects.bulk_create(
      [
        ProviderPerson(
          code="dr-mahesh-marasinhe",
          organization=organizations["bibila-hospital"],
          full_name="DR MAHESH MARASINGHE",
          specialty="Internal Medicine",
          provider_category="doctor",
          registration_no="REG-001",
          is_external=True,
        ),
        ProviderPerson(
          code="dr-praneeth-jayawardhana",
          organization=organizations["pgh-badulla"],
          full_name="DR PRANEETH C JAYAWARDHANA",
          specialty="Clinical Medicine",
          provider_category="doctor",
          registration_no="REG-002",
          is_external=True,
        ),
      ],
      ignore_conflicts=True,
    )

  users = {user.username: user for user in IdentityUser.objects.all()}
  employee_objects = []
  for item in DEFAULT_EMPLOYEES:
    employee_objects.append(
      Employee(
        code=item["code"],
        employee_number=item["employee_number"],
        full_name=item["full_name"],
        job_title=item["job_title"],
        staff_type=item["staff_type"],
        employment_type=item["employment_type"],
        department=item["department"],
        facility=item["facility"],
        user=users.get(item["username"]),
      )
    )
  if not Employee.objects.exists():
    Employee.objects.bulk_create(employee_objects, ignore_conflicts=True)
  else:
    for item in DEFAULT_EMPLOYEES:
      employee = Employee.objects.filter(code=item["code"]).first()
      if not employee:
        continue
      employee.employee_number = item["employee_number"]
      employee.full_name = item["full_name"]
      employee.job_title = item["job_title"]
      employee.staff_type = item["staff_type"]
      employee.employment_type = item["employment_type"]
      employee.department = item["department"]
      employee.facility = item["facility"]
      employee.user = users.get(item["username"])
      employee.is_active = True
      employee.save(update_fields=["employee_number", "full_name", "job_title", "staff_type", "employment_type", "department", "facility", "user", "is_active", "updated_at"])


def _ensure_system_settings_seed() -> None:
  if SystemSetting.objects.exists():
    return

  SystemSetting.objects.bulk_create(
    [SystemSetting(**item) for item in DEFAULT_SYSTEM_SETTINGS],
    ignore_conflicts=True,
  )


def _setting_record(setting: SystemSetting) -> dict:
  return {
    "id": str(setting.pk),
    "section": setting.section,
    "key": setting.key,
    "label": setting.label,
    "value": setting.value,
    "detail": setting.detail,
    "kind": setting.kind,
    "tone": setting.tone or "default",
    "sortOrder": setting.sort_order,
    "isEditable": setting.is_editable,
  }


def _settings_payload() -> dict:
  _ensure_system_settings_seed()
  settings = list(SystemSetting.objects.all().order_by("section", "sort_order", "label"))
  sections: dict[str, list[SystemSetting]] = defaultdict(list)

  for setting in settings:
    sections[setting.section].append(setting)

  return {
    "summary": {
      "sections": len(sections),
      "settings": len(settings),
      "editable": sum(1 for setting in settings if setting.is_editable),
    },
    "sections": [
      {
        "section": section,
        "items": [_setting_record(item) for item in items],
      }
      for section, items in sections.items()
    ],
  }


class HealthView(APIView):
  def get(self, request):
    try:
      connection.ensure_connection()
      database_connected = connection.is_usable()
    except Exception:
      database_connected = False

    return Response({"status": "ok", "service": "shin-core", "databaseConnected": database_connected})


class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
  queryset = Doctor.objects.all().order_by("name", "id")
  serializer_class = DoctorSerializer


class PatientViewSet(viewsets.ModelViewSet):
  queryset = Patient.objects.select_related("assigned_doctor").all().order_by("-updated_at", "-date", "-created_at", "-id")
  serializer_class = PatientSerializer

  def get_queryset(self):
    queryset = super().get_queryset()
    query = (self.request.query_params.get("q") or "").strip()
    if query:
      queryset = queryset.filter(
        Q(name__icontains=query) |
        Q(patient_id__icontains=query) |
        Q(phone__icontains=query) |
        Q(email__icontains=query)
      )
    return queryset


class DashboardSummaryView(APIView):
  def get(self, request):
    return Response({
      "patients": Patient.objects.count(),
      "doctors": Doctor.objects.count(),
      "consents": PatientConsentPreference.objects.count(),
      "assignedDoctorLinks": Patient.objects.exclude(assigned_doctor__isnull=True).count(),
    })


class PatientConsentView(APIView):
  def get_patient(self, patient_id: str) -> Patient | None:
    return Patient.objects.filter(pk=patient_id).first()

  def get(self, request, patient_id: str):
    patient = self.get_patient(patient_id)
    if not patient:
      return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

    preferences = _ensure_consent_preferences(patient)
    serializer = PatientConsentPreferenceSerializer(preferences, many=True)

    return Response({
      "patientId": str(patient.pk),
      "patientName": patient.name,
      "patientNumber": _clean(patient.patient_id, ""),
      "birthDate": _clean(patient.ebirthdate or patient.birthdate, ""),
      "sex": _clean(patient.sex, ""),
      "preferences": serializer.data,
      "events": [
        {"id": f"{patient.pk}-1", "dateLabel": _date_label(patient.updated_at or patient.created_at), "action": "Granted", "author": "System"},
        {"id": f"{patient.pk}-2", "dateLabel": _date_label(patient.created_at), "action": "Profile Created", "author": patient.user_id or "System"},
      ],
      "requests": [
        {"id": f"{patient.pk}-req-1", "title": "Referral access review", "status": "Pending"},
        {"id": f"{patient.pk}-req-2", "title": "External portal access", "status": "Draft"},
      ],
    })

  @transaction.atomic
  def patch(self, request, patient_id: str):
    patient = self.get_patient(patient_id)
    if not patient:
      return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

    payload = request.data
    category = (payload.get("category") or "").strip()
    group_name = (payload.get("groupName") or payload.get("group_name") or "").strip()

    if not category or not group_name:
      return Response({"detail": "category and groupName are required."}, status=status.HTTP_400_BAD_REQUEST)

    preference, _ = PatientConsentPreference.objects.update_or_create(
      patient=patient,
      category=category,
      group_name=group_name,
      defaults={
        "grant_access": bool(payload.get("grantAccess", payload.get("grant_access", False))),
        "limit_access": (payload.get("limitAccess") or payload.get("limit_access") or "Restrictive").strip(),
        "details": (payload.get("details") or "").strip(),
      },
    )

    return Response(PatientConsentPreferenceSerializer(preference).data)

  def post(self, request, patient_id: str):
    return self.patch(request, patient_id)


class MpiView(APIView):
  def get(self, request):
    patients = list(Patient.objects.select_related("assigned_doctor").all().order_by("-updated_at", "-date", "-created_at", "-id")[:24])
    all_patients = list(Patient.objects.only("id", "name", "birthdate", "ebirthdate", "updated_at", "date", "created_at"))
    all_doctors = Doctor.objects.count()
    assigned_links = Patient.objects.exclude(assigned_doctor__isnull=True).count()

    duplicate_groups: dict[tuple[str, str], list[Patient]] = defaultdict(list)
    for row in all_patients:
      key = (_clean(row.name, "").lower(), _clean(row.birthdate or row.ebirthdate, ""))
      if key[0]:
        duplicate_groups[key].append(row)

    duplicate_clusters = [
      group
      for group in duplicate_groups.values()
      if len(group) > 1
    ]
    duplicate_clusters.sort(
      key=lambda group: (
        -len(group),
        -max((group_item.updated_at or group_item.date or group_item.created_at or timezone.now()) for group_item in group).timestamp(),
      )
    )

    mpi_patients = []
    for row in patients:
      confidence = _confidence(row)
      tone = _tone(confidence)
      mpi_patients.append(
        {
          "id": str(row.pk),
          "patientNumber": _clean(row.patient_id, f"Patient {row.pk}"),
          "name": _clean(row.name, f"Patient {row.pk}"),
          "sex": _clean(row.sex, "Not recorded"),
          "birthDate": _clean(row.ebirthdate or row.birthdate, "Not recorded"),
          "address": _clean(row.address, "Not recorded"),
          "confidence": confidence,
          "action": _action(tone),
          "tone": tone,
        }
      )

    conflicts = []
    for index, group in enumerate(duplicate_clusters[:6]):
      lead = group[0]
      latest = max((item.updated_at or item.date or item.created_at or timezone.now()) for item in group)
      conflicts.append(
        {
          "id": f"{lead.pk}-{index}",
          "title": f"Potential duplicate cluster for {_clean(lead.name, 'Unnamed patient')}",
          "time": _date_label(latest),
          "tone": "danger" if index < 2 else ("neutral" if index == 2 else "info"),
        }
      )

    patient_count = Patient.objects.count()
    consent_count = PatientConsentPreference.objects.count()
    duplicate_rate = round(((len(duplicate_clusters) * 2) / patient_count) * 100, 1) if patient_count else 0
    integrity = max(
      0,
      min(99, round((assigned_links / max(patient_count, 1)) * 100) + min(20, round((consent_count / max(patient_count, 1)) * 10)))
    )

    return Response({
      "patients": mpi_patients,
      "conflicts": conflicts,
      "dataSources": [
        {"name": "Patient Table", "records": patient_count, "mark": "DB", "tone": "blue"},
        {"name": "Doctor Table", "records": all_doctors, "mark": "DR", "tone": "green"},
        {"name": "Assigned Doctor Links", "records": assigned_links, "mark": "AD", "tone": "pink"},
      ],
      "summary": {
        "integrity": integrity,
        "duplicateRate": duplicate_rate,
        "duplicateClusters": len(duplicate_clusters),
        "assignedDoctorLinks": assigned_links,
      },
    })


def _identity_user_record(user: IdentityUser) -> dict:
  role_link = IdentityUserRole.objects.filter(user=user).select_related("role").first()
  group_link = IdentityUserGroup.objects.filter(user=user).select_related("group").first()
  provider = user.provider_person

  role = role_link.role if role_link else None
  group = group_link.group if group_link else None

  return {
    "id": str(user.pk),
    "username": user.username,
    "displayName": user.display_name,
    "email": user.email or "Not recorded",
    "title": user.title or "Not recorded",
    "status": user.status,
    "mfaEnabled": user.mfa_enabled,
    "isExternal": user.is_external,
    "roleCode": role.code if role else "",
    "roleName": role.name if role else "Unassigned",
    "groupCode": group.code if group else "",
    "groupName": group.name if group else "Unassigned",
    "providerName": provider.full_name if provider else "",
  }


def _identity_lookup_payload() -> dict:
  roles = list(IdentityRole.objects.all().order_by("name", "id"))
  groups = list(IdentityGroup.objects.all().order_by("name", "id"))

  return {
    "roles": [
      {
        "code": role.code,
        "name": role.name,
      }
      for role in roles
    ],
    "groups": [
      {
        "code": group.code,
        "name": group.name,
      }
      for group in groups
    ],
  }


def _employee_record(employee: Employee) -> dict:
  user = employee.user
  role_link = IdentityUserRole.objects.filter(user=user).select_related("role").first() if user else None
  group_link = IdentityUserGroup.objects.filter(user=user).select_related("group").first() if user else None

  return {
    "id": str(employee.pk),
    "code": employee.code,
    "employeeNumber": employee.employee_number,
    "fullName": employee.full_name,
    "jobTitle": employee.job_title,
    "staffType": employee.staff_type,
    "employmentType": employee.employment_type,
    "department": employee.department,
    "facility": employee.facility,
    "isActive": employee.is_active,
    "username": user.username if user else "",
    "roleName": role_link.role.name if role_link else "Unassigned",
    "groupName": group_link.group.name if group_link else "Unassigned",
  }


def _identity_payload() -> dict:
  roles = list(IdentityRole.objects.all().order_by("name", "id"))
  groups = list(IdentityGroup.objects.all().order_by("name", "id"))
  permissions = list(IdentityPermission.objects.all().order_by("module", "code"))
  users = list(IdentityUser.objects.select_related("provider_person").all().order_by("display_name", "id"))
  employees = list(Employee.objects.select_related("user").all().order_by("full_name", "id"))
  organizations = list(ProviderOrganization.objects.all().order_by("name", "id"))
  people = list(ProviderPerson.objects.select_related("organization").all().order_by("full_name", "id"))

  role_permission_counts = {
    role.code: IdentityRolePermission.objects.filter(role=role).count()
    for role in roles
  }
  role_user_counts = {
    role.code: IdentityUserRole.objects.filter(role=role).count()
    for role in roles
  }
  group_user_counts = {
    group.code: IdentityUserGroup.objects.filter(group=group).count()
    for group in groups
  }

  return {
    "summary": {
      "users": len(users),
      "roles": len(roles),
      "groups": len(groups),
      "permissions": len(permissions),
      "providers": len(organizations),
      "employees": len(employees),
      "externalDoctors": sum(1 for person in people if person.provider_category == "doctor"),
      "institutes": sum(1 for organization in organizations if organization.organization_type == "institute"),
    },
    "users": [_identity_user_record(user) for user in users],
    "employees": [_employee_record(employee) for employee in employees],
    "roles": [
      {
        "id": str(role.pk),
        "code": role.code,
        "name": role.name,
        "scope": role.scope,
        "description": role.description,
        "userCount": role_user_counts.get(role.code, 0),
        "permissionCount": role_permission_counts.get(role.code, 0),
      }
      for role in roles
    ],
    "groups": [
      {
        "id": str(group.pk),
        "code": group.code,
        "name": group.name,
        "description": group.description,
        "memberCount": group_user_counts.get(group.code, 0),
      }
      for group in groups
    ],
    "permissions": [
      {
        "id": str(permission.pk),
        "code": permission.code,
        "module": permission.module,
        "description": permission.description,
      }
      for permission in permissions
    ],
    "providerRegistry": {
      "organizations": [
        {
          "id": str(organization.pk),
          "code": organization.code,
          "name": organization.name,
          "providerKind": organization.provider_kind,
          "organizationType": organization.organization_type,
          "isActive": organization.is_active,
        }
        for organization in organizations
      ],
      "people": [
        {
          "id": str(person.pk),
          "code": person.code,
          "fullName": person.full_name,
          "specialty": person.specialty,
          "providerCategory": person.provider_category,
          "organizationName": person.organization.name,
          "registrationNo": person.registration_no,
          "isExternal": person.is_external,
          "isActive": person.is_active,
        }
        for person in people
      ],
    },
  }


class IdentityWorkView(APIView):
  def get(self, request):
    _ensure_identity_seed()
    return Response(_identity_payload())


class IdentityUserAssignmentView(APIView):
  @transaction.atomic
  def patch(self, request, user_id: str):
    _ensure_identity_seed()
    user = IdentityUser.objects.filter(pk=user_id).first()
    if not user:
      return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    payload = request.data
    role_code = (payload.get("roleCode") or payload.get("role_code") or "").strip()
    group_code = (payload.get("groupCode") or payload.get("group_code") or "").strip()
    status_value = (payload.get("status") or user.status).strip() or user.status
    mfa_enabled = bool(payload.get("mfaEnabled", payload.get("mfa_enabled", user.mfa_enabled)))

    user.status = status_value
    user.mfa_enabled = mfa_enabled
    user.updated_at = timezone.now()
    user.save(update_fields=["status", "mfa_enabled", "updated_at"])

    if role_code:
      role = IdentityRole.objects.filter(code=role_code).first()
      if not role:
        return Response({"detail": "Role not found."}, status=status.HTTP_400_BAD_REQUEST)
      IdentityUserRole.objects.filter(user=user).delete()
      IdentityUserRole.objects.create(user=user, role=role)

    if group_code:
      group = IdentityGroup.objects.filter(code=group_code).first()
      if not group:
        return Response({"detail": "Group not found."}, status=status.HTTP_400_BAD_REQUEST)
      IdentityUserGroup.objects.filter(user=user).delete()
      IdentityUserGroup.objects.create(user=user, group=group)

    return Response(_identity_user_record(user))


class SettingsView(APIView):
  def get(self, request):
    return Response(_settings_payload())


class SettingsItemView(APIView):
  @transaction.atomic
  def patch(self, request, setting_id: str):
    _ensure_system_settings_seed()
    setting = SystemSetting.objects.filter(pk=setting_id).first()
    if not setting:
      return Response({"detail": "Setting not found."}, status=status.HTTP_404_NOT_FOUND)

    payload = request.data
    raw_value = payload.get("value")
    if isinstance(raw_value, bool):
      setting.value = "true" if raw_value else "false"
    elif raw_value is None:
      setting.value = ""
    else:
      setting.value = str(raw_value)

    if payload.get("detail") is not None:
      setting.detail = str(payload.get("detail"))

    if payload.get("tone") is not None:
      setting.tone = str(payload.get("tone"))

    setting.save(update_fields=["value", "detail", "tone", "updated_at"])
    return Response(_setting_record(setting))
