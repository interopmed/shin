from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
  DashboardSummaryView,
  DoctorViewSet,
  FacilityDepartmentView,
  FacilityDetailView,
  HealthView,
  IdentityUserAssignmentView,
  IdentityWorkView,
  MpiView,
  PatientConsentView,
  PatientViewSet,
  SettingsItemView,
  SettingsView,
  FacilityListView,
  AuditEventListView,
  AuditMetricsView,
  ThreatAlertListView,
  AuditEventDetailView,
  CareTeamViewSet,
  CareTeamNoteViewSet,
  ProviderDirectoryView,
  TerminologyView,
  IntegrationGatewayView,
  ProviderDetailView,
  ServiceUnitViewSet,
  TerminologyConceptViewSet,
  BedViewSet,
  ClinicalFirmViewSet,
  FirmWardCoverageViewSet,
)

from apps.patients.views import AdmissionViewSet, ImagingRequestViewSet, PatientMaterialViewSet, PatientCountView, PatientSearchView

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patient")
router.register(r"doctors", DoctorViewSet, basename="doctor")
router.register(r"care-teams", CareTeamViewSet, basename="care-team")
router.register(r"care-team-notes", CareTeamNoteViewSet, basename="care-team-note")
router.register(r"service-units", ServiceUnitViewSet, basename="service-unit")
router.register(r"clinical-firms", ClinicalFirmViewSet, basename="clinical-firm")
router.register(r"firm-ward-coverages", FirmWardCoverageViewSet, basename="firm-ward-coverage")
router.register(r"terminology", TerminologyConceptViewSet, basename="terminology-concept")
router.register(r"beds", BedViewSet, basename="bed")
router.register(r"admissions", AdmissionViewSet, basename="admission")
router.register(r"imaging-requests", ImagingRequestViewSet, basename="imaging-request")
router.register(r"patient-materials", PatientMaterialViewSet, basename="patient-material")

urlpatterns = [
  path("health/", HealthView.as_view()),
  path("dashboard/summary/", DashboardSummaryView.as_view()),
  path("identity/work/", IdentityWorkView.as_view()),
  path("identity/work/users/<str:user_id>/", IdentityUserAssignmentView.as_view()),
  path("settings/", SettingsView.as_view()),
  path("settings/items/<str:setting_id>/", SettingsItemView.as_view()),
  path("mpi/", MpiView.as_view()),
  path("patients/count/", PatientCountView.as_view(), name="patient-count"),
  path("patients/search/", PatientSearchView.as_view(), name="patient-search"),
  path("patients/<str:patient_id>/consent/", PatientConsentView.as_view()),
  path("care-team-providers/", ProviderDirectoryView.as_view()),
  path("foundation/terminology/", TerminologyView.as_view()),
  path("foundation/integration/", IntegrationGatewayView.as_view()),
  path("foundation/providers/<str:provider_id>/", ProviderDetailView.as_view()),
  path("", include(router.urls)),
  # New facility endpoint for the Facilities page
  path("facilities/", FacilityListView.as_view()),
  path("facilities/<int:facility_id>", FacilityDetailView.as_view()),
  path("facilities/<int:facility_id>/departments", FacilityDepartmentView.as_view()),
  # New audit endpoints
  path("audit/events/", AuditEventListView.as_view()),
  path("audit/metrics/", AuditMetricsView.as_view()),
  path("audit/alerts/", ThreatAlertListView.as_view()),
  path("audit/events/<str:event_id>/", AuditEventDetailView.as_view()),
]
