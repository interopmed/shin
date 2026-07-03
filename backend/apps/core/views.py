from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
import json

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
  Doctor,
  Employee,
  Facility,
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
  AuditEvent,
  ThreatAlert,
  CareTeam,
  CareTeamMember,
  CareTeamNote,
)
from .serializers import (
  DoctorSerializer,
  PatientConsentPreferenceSerializer,
  PatientSerializer,
  CareTeamNoteSerializer,
  CareTeamMemberSerializer,
  CareTeamSerializer,
)


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
  {"section": "External Data Feeds", "key": "feeds.epic", "label": "Epic Node 2", "value": "Connected", "detail": "Primary enterprise feed for external hospital connectivity.", "kind": "text", "tone": "success", "sort_order": 10, "is_editable": True},
  {"section": "External Data Feeds", "key": "feeds.hl7", "label": "HL7 v2.5 Feed", "value": "Connected", "detail": "Inbound message feed for clinical and lab events.", "kind": "text", "tone": "success", "sort_order": 20, "is_editable": True},
  {"section": "External Data Feeds", "key": "feeds.fhir", "label": "FHIR Server", "value": "Connected", "detail": "FHIR interoperability channel for structured records.", "kind": "text", "tone": "success", "sort_order": 30, "is_editable": True},
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
    page = int(request.query_params.get("page", 1))
    page_size = int(request.query_params.get("pageSize", 10))
    query = request.query_params.get("query", "").strip()
    sex = request.query_params.get("sex", "").strip()
    confidence = request.query_params.get("confidence", "").strip()

    patients_query = Patient.objects.select_related("assigned_doctor").all().order_by("-updated_at", "-date", "-created_at", "-id")

    if query:
      patients_query = patients_query.filter(
        Q(name__icontains=query) | Q(patient_id__icontains=query)
      )

    if sex:
      patients_query = patients_query.filter(sex__iexact=sex)

    # Resolve in memory list to allow dynamic python filtering on calculated confidence score
    patients_all = list(patients_query)

    if confidence:
      if confidence == "high":
        patients_all = [p for p in patients_all if _confidence(p) >= 80]
      elif confidence == "low":
        patients_all = [p for p in patients_all if _confidence(p) < 80]

    total_records = len(patients_all)
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    patients = patients_all[start_index:end_index]

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
          "patients": [
            {
              "id": str(p.pk),
              "patientNumber": _clean(p.patient_id, f"Patient {p.pk}"),
              "name": _clean(p.name, f"Patient {p.pk}"),
              "sex": _clean(p.sex, "Not recorded"),
              "birthDate": _clean(p.ebirthdate or p.birthdate, "Not recorded"),
              "address": _clean(p.address, "Not recorded"),
              "phone": _clean(p.phone, "Not recorded"),
              "email": _clean(p.email, "Not recorded"),
              "lastVisit": _date_label(p.updated_at or p.date or p.created_at or timezone.now()),
            }
            for p in group
          ]
        }
      )

    patient_count = Patient.objects.count()
    consent_count = PatientConsentPreference.objects.count()
    duplicate_rate = round(((len(duplicate_clusters) * 2) / patient_count) * 100, 1) if patient_count else 0
    integrity = max(
      0,
      min(99, round((assigned_links / max(patient_count, 1)) * 100) + min(20, round((consent_count / max(patient_count, 1)) * 10)))
    )

    total_pages = (total_records + page_size - 1) // page_size if total_records else 1

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
      "pagination": {
        "total": total_records,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
      }
    })

  def post(self, request):
    action = request.data.get("action")
    if action == "merge":
      keep_id = request.data.get("keepId")
      delete_ids = request.data.get("deleteIds")

      if not keep_id or not delete_ids:
        return Response({"detail": "keepId and deleteIds are required."}, status=status.HTTP_400_BAD_REQUEST)

      keep_patient = Patient.objects.filter(pk=keep_id).first()
      if not keep_patient:
        return Response({"detail": "Keep patient not found."}, status=status.HTTP_404_NOT_FOUND)

      # Perform database level merge / deletion
      Patient.objects.filter(pk__in=delete_ids).delete()
      return Response({"success": True})

    return Response({"detail": "Action not supported."}, status=status.HTTP_400_BAD_REQUEST)


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


# ---------------------------------------------------------------------------
# Facility endpoints
# ---------------------------------------------------------------------------
class FacilityListView(APIView):
    """List facilities from the database and accept new facility creation."""

    permission_classes = []  # public endpoint

    def _facility_record(self, facility) -> dict:
        return {
            "id": str(facility.pk),
            "name": facility.name,
            "type": facility.type,
            "location": facility.location,
            "departments": facility.departments,
            "rooms": facility.rooms,
            "status": facility.status,
            "occupancy": facility.occupancy,
        }

    def get(self, request):
        facilities = Facility.objects.all().order_by("name")
        return Response([self._facility_record(f) for f in facilities])

    @transaction.atomic
    def post(self, request):
        """Create a new facility."""
        name = (request.data.get("name") or "").strip()
        if not name:
            return Response({"detail": "Facility name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            departments = int(request.data.get("departments", 0) or 0)
            rooms = int(request.data.get("rooms", 0) or 0)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Departments and rooms must be whole numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        occupancy = str(request.data.get("occupancy", "0%")).strip() or "0%"
        if not occupancy.endswith("%"):
            occupancy = f"{occupancy}%"

        facility = Facility.objects.create(
            name=name,
            type=request.data.get("type", "Hospital"),
            location=(request.data.get("location") or "").strip(),
            departments=departments,
            rooms=rooms,
            status=request.data.get("status", "Operational"),
            occupancy=occupancy,
        )
        return Response(self._facility_record(facility), status=status.HTTP_201_CREATED)


class FacilityDetailView(APIView):
    """Update a single facility record."""

    permission_classes = []

    def _facility_record(self, facility) -> dict:
        return {
            "id": str(facility.pk),
            "name": facility.name,
            "type": facility.type,
            "location": facility.location,
            "departments": facility.departments,
            "rooms": facility.rooms,
            "status": facility.status,
            "occupancy": facility.occupancy,
        }

    @transaction.atomic
    def put(self, request, facility_id: str):
        facility = Facility.objects.filter(pk=facility_id).first()
        if not facility:
            return Response({"detail": "Facility not found."}, status=status.HTTP_404_NOT_FOUND)

        name = (request.data.get("name") or "").strip()
        if not name:
            return Response({"detail": "Facility name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            departments = int(request.data.get("departments", 0) or 0)
            rooms = int(request.data.get("rooms", 0) or 0)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Departments and rooms must be whole numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        occupancy = str(request.data.get("occupancy", "0%")).strip() or "0%"
        if not occupancy.endswith("%"):
            occupancy = f"{occupancy}%"

        facility.name = name
        facility.type = request.data.get("type", "Hospital")
        facility.location = (request.data.get("location") or "").strip()
        facility.departments = departments
        facility.rooms = rooms
        facility.status = request.data.get("status", "Operational")
        facility.occupancy = occupancy
        facility.updated_at = timezone.now()
        facility.save(
            update_fields=[
                "name",
                "type",
                "location",
                "departments",
                "rooms",
                "status",
                "occupancy",
                "updated_at",
            ]
        )

        return Response(self._facility_record(facility))


class FacilityDepartmentView(APIView):
    """Get or update structured departments for a facility."""

    permission_classes = []

    def _setting_key(self, facility_id: str) -> str:
        return f"facility.departments.{facility_id}"

    def _normalize_departments(self, raw_departments) -> list[dict]:
        if not isinstance(raw_departments, list):
            return []

        normalized: list[dict] = []
        for row in raw_departments:
            if not isinstance(row, dict):
                continue

            name = str(row.get("name") or "").strip()
            if not name:
                continue

            normalized.append(
                {
                    "name": name,
                    "lead": str(row.get("lead") or "").strip() or "Unassigned",
                    "capacity": str(row.get("capacity") or "").strip() or "Not defined",
                    "status": str(row.get("status") or "").strip() or "Ready",
                }
            )

        return normalized

    def get(self, request, facility_id: str):
        facility = Facility.objects.filter(pk=facility_id).first()
        if not facility:
            return Response({"detail": "Facility not found."}, status=status.HTTP_404_NOT_FOUND)

        setting = SystemSetting.objects.filter(key=self._setting_key(facility_id)).first()
        if setting and setting.value:
            try:
                parsed = json.loads(setting.value)
                departments = self._normalize_departments(parsed)
            except (TypeError, ValueError):
                departments = []
        else:
            departments = []

        if not departments and facility.departments > 0:
            departments = [
                {
                    "name": f"Department {index + 1}",
                    "lead": "Unassigned",
                    "capacity": "Not defined",
                    "status": "Ready",
                }
                for index in range(facility.departments)
            ]

        return Response({"departments": departments})

    @transaction.atomic
    def put(self, request, facility_id: str):
        facility = Facility.objects.filter(pk=facility_id).first()
        if not facility:
            return Response({"detail": "Facility not found."}, status=status.HTTP_404_NOT_FOUND)

        departments = self._normalize_departments(request.data.get("departments", []))
        if len(departments) > 100:
            return Response({"detail": "Department limit exceeded (max 100)."}, status=status.HTTP_400_BAD_REQUEST)

        payload = json.dumps(departments)
        key = self._setting_key(facility_id)

        setting = SystemSetting.objects.filter(key=key).first()
        if setting:
            setting.value = payload
            setting.detail = "Structured department configuration for facility management."
            setting.kind = "json"
            setting.tone = "default"
            setting.is_editable = True
            setting.updated_at = timezone.now()
            setting.save(update_fields=["value", "detail", "kind", "tone", "is_editable", "updated_at"])
        else:
            SystemSetting.objects.create(
                section="Facilities",
                key=key,
                label=f"Facility {facility_id} Departments",
                value=payload,
                detail="Structured department configuration for facility management.",
                kind="json",
                tone="default",
                sort_order=0,
                is_editable=True,
            )

        facility.departments = len(departments)
        facility.updated_at = timezone.now()
        facility.save(update_fields=["departments", "updated_at"])

        return Response({"departments": departments, "count": len(departments)})


# Audit log endpoints
# ---------------------------------------------------------------------------
class AuditEventListView(APIView):
    """List audit events with optional search/filtering, and support posting new events."""
    permission_classes = []

    def get(self, request):
        queryset = AuditEvent.objects.all().order_by("-timestamp")
        
        # Filtering by user_id/node
        user_id = request.query_params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id__iexact=user_id)

        # Filtering by action
        action = request.query_params.get("action")
        if action:
            queryset = queryset.filter(action__iexact=action)

        # Filtering by severity
        severity = request.query_params.get("severity")
        if severity:
            queryset = queryset.filter(severity__iexact=severity)

        # Filtering by source_system
        source_system = request.query_params.get("source_system")
        if source_system:
            queryset = queryset.filter(source_system__iexact=source_system)

        # Search query matching user_id, action, object_type, or trace_id
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(user_id__icontains=search) |
                Q(action__icontains=search) |
                Q(object_type__icontains=search) |
                Q(trace_id__icontains=search) |
                Q(source_system__icontains=search)
            )

        events = []
        for event in queryset[:100]: # limit to 100 results for performance
            events.append({
                "id": str(event.pk),
                "timestamp": event.timestamp.isoformat(),
                "event_id": event.event_id,
                "user_id": event.user_id,
                "action": event.action,
                "object_type": event.object_type,
                "source_system": event.source_system,
                "severity": event.severity,
                "trace_id": event.trace_id,
            })

        return Response({"events": events})

    @transaction.atomic
    def post(self, request):
        """Create a new audit event (e.g. log an access event)."""
        data = request.data
        event = AuditEvent.objects.create(
            event_id=data.get("event_id", "10000"),
            user_id=data.get("user_id", "Unknown"),
            action=data.get("action", "UNKNOWN_ACTION"),
            object_type=data.get("object_type", "Unknown"),
            source_system=data.get("source_system", "Unknown"),
            severity=data.get("severity", "Low"),
            trace_id=data.get("trace_id", ""),
        )
        return Response({
            "id": str(event.pk),
            "timestamp": event.timestamp.isoformat(),
            "event_id": event.event_id,
            "user_id": event.user_id,
            "action": event.action,
            "object_type": event.object_type,
            "source_system": event.source_system,
            "severity": event.severity,
            "trace_id": event.trace_id,
        }, status=status.HTTP_201_CREATED)


class AuditMetricsView(APIView):
    """Retrieve audit statistics and metrics."""
    permission_classes = []

    def get(self, request):
        now = timezone.now()
        yesterday = now - timedelta(hours=24)
        
        # 1. Total events in the last 24h
        total_24h = AuditEvent.objects.filter(timestamp__gte=yesterday).count()
        
        # 2. Anomalous alerts count (we count threat alerts)
        alerts_count = ThreatAlert.objects.count()

        # 3. Compliance Drift (HIPAA/ATNA logs total)
        # We count logs containing ATNA or HIPAA in trace_id/action/source_system
        compliance_drift = AuditEvent.objects.filter(
            Q(trace_id__icontains="ATNA") |
            Q(trace_id__icontains="HIPAA") |
            Q(action__icontains="ATNA") |
            Q(action__icontains="HIPAA")
        ).count()

        # 4. Top active users: Group by user_id and count
        from django.db.models import Count
        top_users_query = AuditEvent.objects.values("user_id").annotate(
            count=Count("id")
        ).order_by("-count")[:10]

        top_users = []
        for row in top_users_query:
            top_users.append({
                "user_id": row["user_id"],
                "count": row["count"]
            })

        return Response({
            "total_events_24h": total_24h,
            "anomalous_alerts_count": alerts_count,
            "compliance_drift": compliance_drift,
            "top_users": top_users
        })


class ThreatAlertListView(APIView):
    """List current threat alerts from the database."""
    permission_classes = []

    def get(self, request):
        alerts = ThreatAlert.objects.all().order_by("-created_at")
        result = []
        for alert in alerts:
            result.append({
                "id": str(alert.pk),
                "title": alert.title,
                "score": alert.score,
                "confidence": alert.confidence,
                "created_at": alert.created_at.isoformat(),
            })
        return Response({"alerts": result})


class AuditEventDetailView(APIView):
    """Retrieve, update, or delete a single audit event."""
    permission_classes = []

    @transaction.atomic
    def patch(self, request, event_id: str):
        event = AuditEvent.objects.filter(pk=event_id).first()
        if not event:
            return Response({"detail": "Audit event not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if "event_id" in data:
            event.event_id = str(data["event_id"])
        if "user_id" in data:
            event.user_id = str(data["user_id"])
        if "action" in data:
            event.action = str(data["action"])
        if "object_type" in data:
            event.object_type = str(data["object_type"])
        if "source_system" in data:
            event.source_system = str(data["source_system"])
        if "severity" in data:
            event.severity = str(data["severity"])
        if "trace_id" in data:
            event.trace_id = str(data["trace_id"])

        event.save()
        return Response({
            "id": str(event.pk),
            "timestamp": event.timestamp.isoformat(),
            "event_id": event.event_id,
            "user_id": event.user_id,
            "action": event.action,
            "object_type": event.object_type,
            "source_system": event.source_system,
            "severity": event.severity,
            "trace_id": event.trace_id,
        })

    @transaction.atomic
    def delete(self, request, event_id: str):
        event = AuditEvent.objects.filter(pk=event_id).first()
        if not event:
            return Response({"detail": "Audit event not found."}, status=status.HTTP_404_NOT_FOUND)
        event.delete()
        return Response({"detail": "Audit event deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class CareTeamViewSet(viewsets.ModelViewSet):
    queryset = CareTeam.objects.all().order_by("name", "id")
    serializer_class = CareTeamSerializer
    permission_classes = []

    def _normalize_id(self, val):
        if val is None:
            return None
        s = str(val).strip()
        if not s or s == "null" or s == "undefined" or s == "":
            return None
        try:
            return int(s)
        except ValueError:
            return None

    @transaction.atomic
    def perform_create(self, serializer):
        data = self.request.data
        lead_doctor_id = self._normalize_id(data.get("leadDoctorId"))
        lead_employee_id = self._normalize_id(data.get("leadEmployeeId"))
        
        care_team = serializer.save(
            lead_doctor_id=lead_doctor_id,
            lead_employee_id=lead_employee_id,
        )

        members_data = data.get("members", [])
        for m in members_data:
            doc_id = self._normalize_id(m.get("doctorId"))
            emp_id = self._normalize_id(m.get("employeeId"))
            if doc_id or emp_id:
                CareTeamMember.objects.create(
                    care_team=care_team,
                    doctor_id=doc_id,
                    employee_id=emp_id,
                    role=m.get("role", "Member")
                )

    @transaction.atomic
    def perform_update(self, serializer):
        data = self.request.data
        lead_doctor_id = self._normalize_id(data.get("leadDoctorId"))
        lead_employee_id = self._normalize_id(data.get("leadEmployeeId"))

        care_team = serializer.save(
            lead_doctor_id=lead_doctor_id,
            lead_employee_id=lead_employee_id,
        )

        if "members" in data:
            CareTeamMember.objects.filter(care_team=care_team).delete()
            members_data = data.get("members", [])
            for m in members_data:
                doc_id = self._normalize_id(m.get("doctorId"))
                emp_id = self._normalize_id(m.get("employeeId"))
                if doc_id or emp_id:
                    CareTeamMember.objects.create(
                        care_team=care_team,
                        doctor_id=doc_id,
                        employee_id=emp_id,
                        role=m.get("role", "Member")
                    )


class CareTeamNoteViewSet(viewsets.ModelViewSet):
    queryset = CareTeamNote.objects.all().order_by("-created_at", "-id")
    serializer_class = CareTeamNoteSerializer
    permission_classes = []


class ProviderDirectoryView(APIView):
    permission_classes = []

    def get(self, request):
        providers = []

        doctors = Doctor.objects.all()
        from django.db.models import Count
        patient_counts = {
            r["assigned_doctor_id"]: r["count"]
            for r in Patient.objects.values("assigned_doctor_id").annotate(count=Count("id"))
            if r["assigned_doctor_id"]
        }

        def get_status_tone(idx, name):
            statuses = ["Available", "On shift", "In consult", "On call"]
            tones = ["blue", "warm", "green", "gray", "dark"]
            status = statuses[idx % len(statuses)]
            tone = tones[idx % len(tones)]
            return status, tone

        for idx, doc in enumerate(doctors):
            patients_count = patient_counts.get(doc.pk, 0)
            status_val, tone_val = get_status_tone(idx, doc.name)
            providers.append({
                "id": f"doc-{doc.pk}",
                "doctorId": str(doc.pk),
                "employeeId": None,
                "name": doc.name,
                "role": doc.qualifications if doc.qualifications else "Physician",
                "specialty": doc.speciality if doc.speciality else "Internal Medicine",
                "department": doc.department if doc.department else "Primary Care",
                "patients": patients_count,
                "status": status_val,
                "tone": tone_val
            })

        employees = Employee.objects.all()
        for idx, emp in enumerate(employees):
            status_val, tone_val = get_status_tone(idx + len(doctors), emp.full_name)
            mock_patients = 12 if "Coordinator" in emp.job_title else (8 if "Lead" in emp.job_title else 0)
            providers.append({
                "id": f"emp-{emp.pk}",
                "doctorId": None,
                "employeeId": str(emp.pk),
                "name": emp.full_name,
                "role": emp.job_title if emp.job_title else "Clinical Staff",
                "specialty": "Clinical Support" if emp.staff_type == "clinical" else "Care Coordination",
                "department": emp.department if emp.department else "Care Coordination",
                "patients": mock_patients,
                "status": status_val,
                "tone": tone_val
            })

        return Response(providers)


class TerminologyView(APIView):
  permission_classes = []

  def get(self, request):
    mappings = [
      { "id": "1", "sourceCode": "L-GLU", "sourceSystem": "Legacy LIS", "targetCode": "1558-6", "targetSystem": "LOINC", "displayName": "Glucose [Mass/volume] in Serum or Plasma", "status": "Active" },
      { "id": "2", "sourceCode": "METF-500", "sourceSystem": "Hospital Formulary", "targetCode": "866514", "targetSystem": "RxNorm", "displayName": "Metformin hydrochloride 500 MG Oral Tablet", "status": "Active" },
      { "id": "3", "sourceCode": "DIA-01", "sourceSystem": "EHR Clinical", "targetCode": "E11.9", "targetSystem": "ICD-10-CM", "displayName": "Type 2 diabetes mellitus without complications", "status": "Active" },
      { "id": "4", "sourceCode": "CBC-WBC", "sourceSystem": "Legacy LIS", "targetCode": "6690-2", "targetSystem": "LOINC", "displayName": "Leukocytes [#/volume] in Blood by Automated count", "status": "Active" },
      { "id": "5", "sourceCode": "AST-SGOT", "sourceSystem": "Legacy LIS", "targetCode": "1920-8", "targetSystem": "LOINC", "displayName": "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma", "status": "Active" },
      { "id": "6", "sourceCode": "INS-GLAR", "sourceSystem": "Hospital Formulary", "targetCode": "274783", "targetSystem": "RxNorm", "displayName": "insulin glargine 100 UNT/ML Injectable Solution", "status": "Active" },
      { "id": "7", "sourceCode": "HTN-02", "sourceSystem": "EHR Clinical", "targetCode": "I10", "targetSystem": "ICD-10-CM", "displayName": "Essential (primary) hypertension", "status": "Active" }
    ]

    return Response({
      "mappings": mappings,
      "stats": {
        "totalMappings": len(mappings),
        "activeMappings": sum(1 for m in mappings if m["status"] == "Active"),
        "systemsMapped": len(set(m["targetSystem"] for m in mappings))
      }
    })


class IntegrationGatewayView(APIView):
  permission_classes = []

  def get(self, request):
    feeds = [
      { "name": "Epic Node 2", "protocol": "FHIR R4", "status": "Connected", "latency": "120ms", "processed": 1420, "tone": "success" },
      { "name": "HL7 Lab Feed", "protocol": "HL7 v2.5", "status": "Connected", "latency": "45ms", "processed": 3104, "tone": "success" },
      { "name": "EHR Notes Callback", "protocol": "Webhook", "status": "Active", "latency": "210ms", "processed": 482, "tone": "success" },
      { "name": "External Pharmacy Hub", "protocol": "NCPDP 10.6", "status": "Offline", "latency": "0ms", "processed": 0, "tone": "danger" }
    ]

    messageQueue = [
      { "id": "msg-001", "timestamp": "2026-06-30T19:43:20Z", "type": "ADT^A08 (Update Patient)", "source": "Epic Node 2", "status": "Success", "details": "Reconciled Bessie Cooper (EID-P10001) in MPI" },
      { "id": "msg-002", "timestamp": "2026-06-30T19:40:15Z", "type": "ORU^R01 (Observation Result)", "source": "HL7 Lab Feed", "status": "Success", "details": "Delivered blood panel LOINC 1558-6 to EHR" },
      { "id": "msg-003", "timestamp": "2026-06-30T19:35:10Z", "type": "MDM^T02 (Document Content)", "source": "EHR Notes", "status": "Success", "details": "Archived physician note for Patient P10001" },
      { "id": "msg-004", "timestamp": "2026-06-30T19:22:44Z", "type": "ADT^A01 (Admit Patient)", "source": "Epic Node 2", "status": "Success", "details": "Created new MPI identity candidate" },
      { "id": "msg-005", "timestamp": "2026-06-30T19:15:02Z", "type": "OMP^O09 (Medication Order)", "source": "EHR Notes", "status": "Failed", "details": "External Pharmacy Hub connection timeout (EPERM)" }
    ]

    return Response({
      "feeds": feeds,
      "messageQueue": messageQueue,
      "stats": {
        "successRate": round((sum(1 for m in messageQueue if m["status"] == "Success") / len(messageQueue)) * 100, 1) if messageQueue else 100.0,
        "averageLatency": "125ms",
        "queueSize": 1
      }
    })


class ProviderDetailView(APIView):
  permission_classes = []

  def get(self, request, provider_id: str):
    provider_type, actual_id = provider_id.split("-", 1) if "-" in provider_id else ("", provider_id)
    
    name = "Unknown Provider"
    role = "Clinical Staff"
    specialty = "General"
    department = "General Medicine"
    status = "Available"
    tone = "success"
    patients_list = []

    if provider_type == "doc":
      doctor = Doctor.objects.filter(pk=actual_id).first()
      if doctor:
        name = doctor.name
        role = doctor.qualifications if doctor.qualifications else "Physician"
        specialty = doctor.speciality if doctor.speciality else "Internal Medicine"
        department = doctor.department if doctor.department else "Primary Care"
        # Query patient assignments
        assigned_patients = Patient.objects.filter(assigned_doctor=doctor).order_by("name")
        for p in assigned_patients:
          patients_list.append({
            "id": str(p.pk),
            "patientNumber": p.patient_id if p.patient_id else f"P{10000+p.pk}",
            "name": p.name,
            "birthDate": p.ebirthdate if p.ebirthdate else (p.birthdate if p.birthdate else "Not recorded"),
            "phone": p.phone if p.phone else "Not recorded",
            "email": p.email if p.email else "Not recorded",
            "status": p.moa if p.moa else "Active",
            "lastVisit": p.editted_time if p.editted_time else "Not recorded"
          })
    elif provider_type == "emp":
      employee = Employee.objects.filter(pk=actual_id).first()
      if employee:
        name = employee.full_name
        role = employee.job_title if employee.job_title else "Clinical Staff"
        specialty = "Clinical Support" if employee.staff_type == "clinical" else "Care Coordination"
        department = employee.department if employee.department else "Care Coordination"
        status = "On shift" if employee.is_active else "Offline"
        tone = "success" if employee.is_active else "danger"
        # Coordinators mock-assign 5 patients
        if "Coordinator" in role:
          sample_patients = Patient.objects.all().order_by("id")[:5]
          for p in sample_patients:
            patients_list.append({
              "id": str(p.pk),
              "patientNumber": p.patient_id if p.patient_id else f"P{10000+p.pk}",
              "name": p.name,
              "birthDate": p.ebirthdate if p.ebirthdate else (p.birthdate if p.birthdate else "Not recorded"),
              "phone": p.phone if p.phone else "Not recorded",
              "email": p.email if p.email else "Not recorded",
              "status": p.moa if p.moa else "Active",
              "lastVisit": p.editted_time if p.editted_time else "Not recorded"
            })

    return Response({
      "id": provider_id,
      "name": name,
      "role": role,
      "specialty": specialty,
      "department": department,
      "status": status,
      "tone": tone,
      "patients": patients_list
    })

