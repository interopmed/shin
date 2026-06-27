from django.db import models
from django.utils import timezone


class Doctor(models.Model):
  name = models.CharField(max_length=100)
  f_name = models.CharField(max_length=30, blank=True, default="")
  l_name = models.CharField(max_length=30, blank=True, default="")
  phone = models.CharField(max_length=100, blank=True, default="")
  address = models.CharField(max_length=100, blank=True, default="")
  email = models.EmailField(null=True, blank=True)
  department = models.CharField(max_length=100, blank=True, default="")
  qualifications = models.CharField(max_length=50, blank=True, default="")
  speciality = models.CharField(max_length=100, blank=True, null=True, default="")
  notes = models.CharField(max_length=500, blank=True, default="")
  institute = models.IntegerField(default=0)
  due_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
  user_id = models.CharField(max_length=100, blank=True, default="")
  img_url = models.CharField(max_length=100, blank=True, default="")

  class Meta:
    managed = False
    db_table = "doctor"

  def __str__(self) -> str:
    return self.name


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
    Doctor,
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
