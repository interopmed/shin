from django.db import models
from django.utils import timezone


class Patient(models.Model):
  name = models.CharField(max_length=100)
  phone = models.CharField(max_length=100, blank=True, default="")
  address = models.CharField(max_length=100, blank=True, default="")
  email = models.EmailField(null=True, blank=True)
  sex = models.CharField(max_length=100, blank=True, default="")
  birthdate = models.CharField(max_length=100, blank=True, default="")
  ebirthdate = models.CharField(max_length=20, blank=True, default="")
  age = models.CharField(max_length=100, blank=True, default="")
  bloodgroup = models.CharField(max_length=100, blank=True, default="")
  assigned_doctor = models.ForeignKey(
    "doctors.Doctor",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    db_column="assigned_doctor_id",
    related_name="assigned_patients",
  )
  doctor = models.CharField(max_length=100, blank=True, default="")
  user_id = models.CharField(max_length=100, blank=True, default="")
  patient_id = models.CharField(max_length=100, blank=True, default="")
  img_url = models.CharField(max_length=100, blank=True, default="")
  note = models.CharField(max_length=250, blank=True, default="")
  moa = models.CharField(max_length=100, blank=True, default="")
  editted_time = models.CharField(max_length=100, blank=True, default="")
  date = models.DateTimeField(null=True, blank=True)
  created_at = models.DateTimeField(null=True, blank=True)
  updated_at = models.DateTimeField(null=True, blank=True)

  class Meta:
    managed = False
    db_table = "patient"

  def __str__(self) -> str:
    return self.name


class PatientConsentPreference(models.Model):
  patient = models.ForeignKey(
    Patient,
    on_delete=models.CASCADE,
    db_column="patient_id",
    related_name="consent_preferences",
  )
  category = models.TextField()
  group_name = models.TextField()
  grant_access = models.BooleanField(default=True)
  limit_access = models.TextField(default="Restrictive")
  details = models.TextField(default="")
  updated_at = models.DateTimeField(default=timezone.now)
  created_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "patient_consent_preferences"
    unique_together = (("patient", "category", "group_name"),)

  def __str__(self) -> str:
    return f"{self.category} - {self.group_name}"


class IdentityRole(models.Model):
  code = models.CharField(max_length=80, unique=True)
  name = models.CharField(max_length=120)
  scope = models.CharField(max_length=80, default="system")
  description = models.TextField(blank=True, default="")
  is_system = models.BooleanField(default=True)
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "identity_role"

  def __str__(self) -> str:
    return self.name


class IdentityGroup(models.Model):
  code = models.CharField(max_length=80, unique=True)
  name = models.CharField(max_length=120)
  description = models.TextField(blank=True, default="")
  is_system = models.BooleanField(default=True)
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "identity_group"

  def __str__(self) -> str:
    return self.name


class IdentityPermission(models.Model):
  code = models.CharField(max_length=120, unique=True)
  module = models.CharField(max_length=80, default="core")
  description = models.TextField(blank=True, default="")
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "identity_permission"

  def __str__(self) -> str:
    return self.code


class IdentityRolePermission(models.Model):
  role = models.ForeignKey(IdentityRole, on_delete=models.CASCADE, db_column="role_id")
  permission = models.ForeignKey(IdentityPermission, on_delete=models.CASCADE, db_column="permission_id")

  class Meta:
    managed = False
    db_table = "identity_role_permission"
    unique_together = (("role", "permission"),)


class IdentityUser(models.Model):
  username = models.CharField(max_length=120, unique=True)
  display_name = models.CharField(max_length=160)
  email = models.EmailField(blank=True, default="")
  title = models.CharField(max_length=160, blank=True, default="")
  status = models.CharField(max_length=40, default="Active")
  mfa_enabled = models.BooleanField(default=False)
  is_external = models.BooleanField(default=False)
  provider_person = models.ForeignKey(
    "ProviderPerson",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    db_column="provider_person_id",
    related_name="linked_users",
  )
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "identity_user"

  def __str__(self) -> str:
    return self.display_name


class Employee(models.Model):
  code = models.CharField(max_length=80, unique=True)
  user = models.ForeignKey(
    IdentityUser,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    db_column="user_id",
    related_name="employee_profiles",
  )
  employee_number = models.CharField(max_length=80, unique=True)
  full_name = models.CharField(max_length=160)
  job_title = models.CharField(max_length=160, blank=True, default="")
  staff_type = models.CharField(max_length=40, default="non_clinical")
  employment_type = models.CharField(max_length=40, default="full_time")
  department = models.CharField(max_length=120, blank=True, default="")
  facility = models.CharField(max_length=120, blank=True, default="")
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "employee"

  def __str__(self) -> str:
    return self.full_name


class LabRequest(models.Model):
  request_no = models.CharField(max_length=80, unique=True)
  patient = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="patient_id", related_name="lab_requests")
  requested_by_employee = models.ForeignKey(
    Employee,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    db_column="requested_by_employee_id",
    related_name="lab_requests",
  )
  requested_by_provider = models.ForeignKey(
    "ProviderPerson",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    db_column="requested_by_provider_person_id",
    related_name="lab_requests",
  )
  requested_by_organization = models.ForeignKey(
    "ProviderOrganization",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    db_column="requested_by_organization_id",
    related_name="lab_requests",
  )
  request_source = models.CharField(max_length=40, default="internal")
  status = models.CharField(max_length=40, default="draft")
  is_self_requested = models.BooleanField(default=False)
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "lab_request"

  def __str__(self) -> str:
    return self.request_no


class SystemSetting(models.Model):
  section = models.CharField(max_length=120)
  key = models.CharField(max_length=120, unique=True)
  label = models.CharField(max_length=160)
  value = models.TextField(blank=True, default="")
  detail = models.TextField(blank=True, default="")
  kind = models.CharField(max_length=40, default="text")
  tone = models.CharField(max_length=40, blank=True, default="default")
  sort_order = models.IntegerField(default=0)
  is_editable = models.BooleanField(default=True)
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "system_setting"

  def __str__(self) -> str:
    return f"{self.section}: {self.label}"


class IdentityUserRole(models.Model):
  user = models.ForeignKey(IdentityUser, on_delete=models.CASCADE, db_column="user_id")
  role = models.ForeignKey(IdentityRole, on_delete=models.CASCADE, db_column="role_id")

  class Meta:
    managed = False
    db_table = "identity_user_role"
    unique_together = (("user", "role"),)


class IdentityUserGroup(models.Model):
  user = models.ForeignKey(IdentityUser, on_delete=models.CASCADE, db_column="user_id")
  group = models.ForeignKey(IdentityGroup, on_delete=models.CASCADE, db_column="group_id")

  class Meta:
    managed = False
    db_table = "identity_user_group"
    unique_together = (("user", "group"),)


class ProviderOrganization(models.Model):
  code = models.CharField(max_length=80, unique=True)
  name = models.CharField(max_length=160)
  provider_kind = models.CharField(max_length=40, default="external")
  organization_type = models.CharField(max_length=40, default="other")
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "provider_organization"

  def __str__(self) -> str:
    return self.name


class ProviderPerson(models.Model):
  code = models.CharField(max_length=80, unique=True)
  organization = models.ForeignKey(
    ProviderOrganization,
    on_delete=models.CASCADE,
    db_column="organization_id",
    related_name="people",
  )
  full_name = models.CharField(max_length=160)
  specialty = models.CharField(max_length=120, blank=True, default="")
  provider_category = models.CharField(max_length=40, default="doctor")
  registration_no = models.CharField(max_length=80, blank=True, default="")
  is_external = models.BooleanField(default=True)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(default=timezone.now)
  updated_at = models.DateTimeField(default=timezone.now)

  class Meta:
    managed = False
    db_table = "provider_person"

  def __str__(self) -> str:
    return self.full_name


class Facility(models.Model):
    TYPE_CHOICES = [
        ("Hospital", "Hospital"),
        ("Outpatient", "Outpatient"),
        ("Diagnostic Lab", "Diagnostic Lab"),
        ("Telehealth", "Telehealth"),
        ("Other", "Other"),
    ]

    STATUS_CHOICES = [
        ("Operational", "Operational"),
        ("Maintenance", "Maintenance"),
        ("Offline", "Offline"),
    ]

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, default="Hospital")
    location = models.CharField(max_length=200, blank=True, default="")
    departments = models.IntegerField(default=0)
    rooms = models.IntegerField(default=0)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Operational")
    occupancy = models.CharField(max_length=10, default="0%")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    @property
    def dynamic_departments(self):
        return self.service_units.count()

    @property
    def dynamic_rooms(self):
        from django.db.models import Sum
        return self.service_units.aggregate(Sum('capacity'))['capacity__sum'] or 0

    @property
    def dynamic_occupancy(self):
        total_rooms = self.dynamic_rooms
        if total_rooms == 0:
            return "0%"
        from .models import PatientUnitAssignment
        total_patients = PatientUnitAssignment.objects.filter(unit__facility=self, is_current=True).count()
        return f"{round((total_patients / total_rooms) * 100)}%"

    class Meta:
        managed = False
        db_table = "facility"

    def __str__(self) -> str:
        return self.name


class AuditEvent(models.Model):
    timestamp = models.DateTimeField(default=timezone.now)
    event_id = models.CharField(max_length=50)
    user_id = models.CharField(max_length=100)
    action = models.CharField(max_length=100)
    object_type = models.CharField(max_length=200)
    source_system = models.CharField(max_length=100)
    severity = models.CharField(max_length=50)
    trace_id = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "audit_event"

    def __str__(self) -> str:
        return f"{self.action} by {self.user_id}"


class ThreatAlert(models.Model):
    title = models.CharField(max_length=200)
    score = models.IntegerField(default=0)
    confidence = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "threat_alert"

    def __str__(self) -> str:
        return self.title


class CareTeam(models.Model):
    name = models.CharField(max_length=255)
    lead_doctor = models.ForeignKey(
        "doctors.Doctor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="lead_doctor_id",
        related_name="led_care_teams",
    )
    lead_employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="lead_employee_id",
        related_name="led_care_teams",
    )
    risk = models.CharField(max_length=50, default="Routine")
    status = models.CharField(max_length=50, default="Active")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "care_team"

    def __str__(self) -> str:
        return self.name


class CareTeamMember(models.Model):
    care_team = models.ForeignKey(
        CareTeam,
        on_delete=models.CASCADE,
        db_column="care_team_id",
        related_name="members",
    )
    doctor = models.ForeignKey(
        "doctors.Doctor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="doctor_id",
        related_name="care_team_memberships",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="employee_id",
        related_name="care_team_memberships",
    )
    role = models.CharField(max_length=100, default="Member")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "care_team_member"
        unique_together = (("care_team", "doctor", "employee"),)


class CareTeamNote(models.Model):
    care_team = models.ForeignKey(
        CareTeam,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="care_team_id",
        related_name="notes",
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "care_team_note"

    def __str__(self) -> str:
        return self.title


class TerminologyConcept(models.Model):
    category = models.CharField(max_length=50)
    code = models.CharField(max_length=100)
    display = models.CharField(max_length=255)
    system = models.CharField(max_length=255, default="http://snomed.info/sct")

    class Meta:
        managed = True
        db_table = "terminology_concept"
        unique_together = (("system", "code", "category"),)

    def __str__(self) -> str:
        return f"{self.display} ({self.code})"

class ServiceUnit(models.Model):
    UNIT_TYPES = [
        ("ward", "Inpatient Ward"),
        ("icu", "Intensive Care Unit"),
        ("emergency", "Emergency / ETU"),
        ("opd", "Outpatient Department"),
        ("clinic", "Specialty Clinic"),
        ("lab", "Laboratory / Pathology"),
        ("radiology", "Radiology"),
        ("pharmacy", "Pharmacy"),
        ("procedure", "Procedure Unit"),
        ("therapy", "Therapy Department"),
    ]
    name = models.CharField(max_length=150)
    unit_type = models.CharField(max_length=50, choices=UNIT_TYPES)
    snomed_unit_type = models.ForeignKey(TerminologyConcept, on_delete=models.SET_NULL, null=True, blank=True, related_name="unit_types")
    facility = models.ForeignKey('Facility', on_delete=models.CASCADE, related_name="service_units", null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name="sub_units", null=True, blank=True)
    department = models.CharField(max_length=100, blank=True, default="")
    snomed_department = models.ForeignKey(TerminologyConcept, on_delete=models.SET_NULL, null=True, blank=True, related_name="departments")
    description = models.TextField(blank=True, default="")
    capacity = models.IntegerField(default=0) # 0 for non-bed units like OPD
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = True
        db_table = "service_unit"

    def __str__(self) -> str:
        return self.name

class ClinicalFirm(models.Model):
    name = models.CharField(max_length=255)
    facility = models.ForeignKey('Facility', on_delete=models.CASCADE, related_name="clinical_firms", null=True, blank=True)
    lead_consultant = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_firms",
    )
    specialty = models.CharField(max_length=150, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = True
        db_table = "clinical_firm"

    def __str__(self) -> str:
        return self.name

class FirmWardCoverage(models.Model):
    firm = models.ForeignKey(ClinicalFirm, on_delete=models.CASCADE, related_name="ward_coverages")
    unit = models.ForeignKey(ServiceUnit, on_delete=models.CASCADE, related_name="firm_coverages")
    is_exclusive = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = True
        db_table = "firm_ward_coverage"
        unique_together = (("firm", "unit"),)

class ServiceUnitStaff(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, db_column="employee_id", related_name="unit_assignments")
    unit = models.ForeignKey(ServiceUnit, on_delete=models.CASCADE, db_column="unit_id", related_name="assigned_staff")
    is_primary = models.BooleanField(default=True)
    role = models.CharField(max_length=40, default="staff")
    assigned_at = models.DateTimeField(default=timezone.now)
    assigned_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = True
        db_table = "service_unit_staff"
        unique_together = (("employee", "unit"),)


class Bed(models.Model):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("occupied", "Occupied"),
        ("maintenance", "Maintenance"),
    ]
    unit = models.ForeignKey(ServiceUnit, on_delete=models.CASCADE, related_name="beds")
    bed_number = models.CharField(max_length=50) # e.g. "Bed 1", "Bed 2"
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="available")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = True
        db_table = "bed"
        unique_together = (("unit", "bed_number"),)

    def __str__(self) -> str:
        return f"{self.unit.name} - {self.bed_number}"


class PatientUnitAssignment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="patient_id", related_name="unit_assignments")
    unit = models.ForeignKey(ServiceUnit, on_delete=models.CASCADE, db_column="unit_id", related_name="assigned_patients")
    firm = models.ForeignKey(ClinicalFirm, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_patients")
    bed = models.ForeignKey(Bed, on_delete=models.SET_NULL, null=True, blank=True, related_name="assignments")
    admitted_at = models.DateTimeField(default=timezone.now)
    discharged_at = models.DateTimeField(null=True, blank=True)
    is_current = models.BooleanField(default=True)

    class Meta:
        managed = True
        db_table = "patient_unit_assignment"


class PatientReferral(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column="patient_id", related_name="referrals")
    referring_employee = models.ForeignKey(Employee, on_delete=models.CASCADE, db_column="referring_employee_id", related_name="made_referrals")
    referred_to_employee = models.ForeignKey(Employee, on_delete=models.CASCADE, db_column="referred_to_employee_id", related_name="received_referrals")
    reason = models.TextField(blank=True, default="")
    referred_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = True
        db_table = "patient_referral"

