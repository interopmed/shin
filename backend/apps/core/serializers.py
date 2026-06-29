from datetime import datetime

from django.utils import timezone
from rest_framework import serializers

from .models import Doctor, Patient, PatientConsentPreference, CareTeam, CareTeamMember, CareTeamNote, Employee


def _format_datetime(value) -> str:
  if not value:
    return "Not recorded"

  if isinstance(value, str):
    return value

  if timezone.is_aware(value):
    value = timezone.localtime(value)

  if hasattr(value, "strftime"):
    return value.strftime("%b %d, %Y").replace(" 0", " ")

  return str(value)


def _calculate_age(value: str | None) -> str | None:
  if not value:
    return None

  try:
    birth_date = datetime.fromisoformat(value).date()
  except ValueError:
    return None

  today = timezone.localdate()
  age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
  return str(max(age, 0))


class DoctorSerializer(serializers.ModelSerializer):
  id = serializers.CharField(source="pk", read_only=True)

  class Meta:
    model = Doctor
    fields = ["id", "name"]


class PatientSerializer(serializers.ModelSerializer):
  id = serializers.CharField(source="pk", read_only=True)
  assignedDoctorId = serializers.CharField(source="assigned_doctor_id", allow_blank=True, allow_null=True, required=False)
  doctor = serializers.CharField(required=False, allow_blank=True)
  patientNumber = serializers.CharField(source="patient_id", required=False, allow_blank=True)
  birthDate = serializers.CharField(source="birthdate", required=False, allow_blank=True)
  birthDateRaw = serializers.CharField(source="birthdate", read_only=True)
  bloodGroup = serializers.CharField(source="bloodgroup", required=False, allow_blank=True)
  userId = serializers.CharField(source="user_id", required=False, allow_blank=True)
  imageUrl = serializers.CharField(source="img_url", required=False, allow_blank=True)
  methodOfArrival = serializers.CharField(source="moa", required=False, allow_blank=True)
  editedTime = serializers.CharField(source="editted_time", required=False, allow_blank=True)
  assignedDoctorName = serializers.SerializerMethodField()
  lastVisit = serializers.SerializerMethodField()
  createdAt = serializers.SerializerMethodField()
  updatedAt = serializers.SerializerMethodField()
  status = serializers.SerializerMethodField()

  class Meta:
    model = Patient
    fields = [
      "id",
      "name",
      "phone",
      "email",
      "birthDate",
      "age",
      "status",
      "assignedDoctorId",
      "doctor",
      "patientNumber",
      "bloodGroup",
      "birthDateRaw",
      "address",
      "sex",
      "userId",
      "imageUrl",
      "assignedDoctorName",
      "note",
      "methodOfArrival",
      "editedTime",
      "lastVisit",
      "createdAt",
      "updatedAt",
    ]

  def get_lastVisit(self, obj: Patient) -> str:
    return _format_datetime(obj.updated_at or obj.date or obj.created_at)

  def get_createdAt(self, obj: Patient) -> str:
    return _format_datetime(obj.created_at)

  def get_updatedAt(self, obj: Patient) -> str:
    return _format_datetime(obj.updated_at)

  def get_status(self, obj: Patient) -> str:
    return "Active"

  def get_assignedDoctorName(self, obj: Patient) -> str:
    assigned_doctor = getattr(obj, "assigned_doctor", None)
    if assigned_doctor and getattr(assigned_doctor, "name", ""):
      return assigned_doctor.name
    return getattr(obj, "doctor", "") or "Unassigned"

  def validate(self, attrs):
    assigned_doctor_id = attrs.get("assigned_doctor_id")
    if assigned_doctor_id == "":
      attrs["assigned_doctor_id"] = None
    if attrs.get("patient_id") == "":
      attrs["patient_id"] = None
    return attrs

  def _sync_birth_fields(self, patient: Patient, birthdate: str | None) -> None:
    patient.birthdate = birthdate or ""
    patient.ebirthdate = birthdate or ""
    patient.age = _calculate_age(birthdate) or ""

  def create(self, validated_data):
    birthdate = validated_data.pop("birthdate", "")
    patient = Patient(**validated_data)
    self._sync_birth_fields(patient, birthdate)
    patient.save(force_insert=True)
    return patient

  def update(self, instance, validated_data):
    birthdate = validated_data.pop("birthdate", instance.birthdate)
    for field, value in validated_data.items():
      setattr(instance, field, value)
    self._sync_birth_fields(instance, birthdate)
    instance.save(force_update=True)
    return instance

  def to_representation(self, instance):
    data = super().to_representation(instance)
    data["birthDate"] = _format_datetime(getattr(instance, "ebirthdate", None) or getattr(instance, "birthdate", None))
    data["birthDateRaw"] = getattr(instance, "ebirthdate", None) or getattr(instance, "birthdate", None) or ""
    data["lastVisit"] = _format_datetime(getattr(instance, "updated_at", None) or getattr(instance, "date", None) or getattr(instance, "created_at", None))
    data["createdAt"] = _format_datetime(getattr(instance, "created_at", None))
    data["updatedAt"] = _format_datetime(getattr(instance, "updated_at", None))
    data["patientNumber"] = getattr(instance, "patient_id", "") or ""
    data["bloodGroup"] = getattr(instance, "bloodgroup", "") or ""
    data["userId"] = getattr(instance, "user_id", "") or ""
    data["imageUrl"] = getattr(instance, "img_url", "") or ""
    data["methodOfArrival"] = getattr(instance, "moa", "") or ""
    data["editedTime"] = getattr(instance, "editted_time", "") or ""
    data["assignedDoctorId"] = str(getattr(instance, "assigned_doctor_id", "") or "")
    assigned_doctor = getattr(instance, "assigned_doctor", None)
    data["doctor"] = getattr(assigned_doctor, "name", "") or getattr(instance, "doctor", "") or "Unassigned"
    data["assignedDoctorName"] = getattr(assigned_doctor, "name", "") or getattr(instance, "doctor", "") or "Unassigned"
    data["name"] = getattr(instance, "name", "") or ""
    data["phone"] = getattr(instance, "phone", "") or ""
    data["email"] = getattr(instance, "email", "") or "Not recorded"
    data["address"] = getattr(instance, "address", "") or ""
    data["sex"] = getattr(instance, "sex", "") or ""
    data["note"] = getattr(instance, "note", "") or ""
    return data


class PatientConsentPreferenceSerializer(serializers.ModelSerializer):
  groupName = serializers.CharField(source="group_name")
  grantAccess = serializers.BooleanField(source="grant_access")
  limitAccess = serializers.CharField(source="limit_access")

  class Meta:
    model = PatientConsentPreference
    fields = ["category", "groupName", "grantAccess", "limitAccess", "details"]


class CareTeamNoteSerializer(serializers.ModelSerializer):
  careTeamId = serializers.PrimaryKeyRelatedField(source="care_team", queryset=CareTeam.objects.all(), required=False, allow_null=True)

  class Meta:
    model = CareTeamNote
    fields = ["id", "careTeamId", "title", "content", "created_at", "updated_at"]


class CareTeamMemberSerializer(serializers.ModelSerializer):
  id = serializers.CharField(source="pk", read_only=True)
  doctorId = serializers.CharField(source="doctor_id", allow_null=True, required=False)
  employeeId = serializers.CharField(source="employee_id", allow_null=True, required=False)
  name = serializers.SerializerMethodField()
  role = serializers.CharField(default="Member")

  class Meta:
    model = CareTeamMember
    fields = ["id", "doctorId", "employeeId", "name", "role"]

  def get_name(self, obj):
    if obj.doctor:
      return obj.doctor.name
    if obj.employee:
      return obj.employee.full_name
    return "Unknown"


class CareTeamSerializer(serializers.ModelSerializer):
  id = serializers.CharField(source="pk", read_only=True)
  leadDoctorId = serializers.CharField(source="lead_doctor_id", allow_null=True, required=False)
  leadEmployeeId = serializers.CharField(source="lead_employee_id", allow_null=True, required=False)
  leadName = serializers.SerializerMethodField()
  members = CareTeamMemberSerializer(many=True, read_only=True)

  class Meta:
    model = CareTeam
    fields = ["id", "name", "leadDoctorId", "leadEmployeeId", "leadName", "risk", "status", "members"]

  def get_leadName(self, obj):
    if obj.lead_doctor:
      return obj.lead_doctor.name
    if obj.lead_employee:
      return obj.lead_employee.full_name
    return "Unassigned"
