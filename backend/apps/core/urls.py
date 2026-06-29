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
)

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patient")
router.register(r"doctors", DoctorViewSet, basename="doctor")

urlpatterns = [
  path("health/", HealthView.as_view()),
  path("dashboard/summary/", DashboardSummaryView.as_view()),
  path("identity/work/", IdentityWorkView.as_view()),
  path("identity/work/users/<str:user_id>/", IdentityUserAssignmentView.as_view()),
  path("settings/", SettingsView.as_view()),
  path("settings/items/<str:setting_id>/", SettingsItemView.as_view()),
  path("mpi/", MpiView.as_view()),
  path("patients/<str:patient_id>/consent/", PatientConsentView.as_view()),
  path("", include(router.urls)),
  # New facility endpoint for the Facilities page
  path("facilities/", FacilityListView.as_view()),
  path("facilities/<int:facility_id>", FacilityDetailView.as_view()),
  path("facilities/<int:facility_id>/departments", FacilityDepartmentView.as_view()),
  # New audit endpoints
  path("audit/events/", AuditEventListView.as_view()),
  path("audit/metrics/", AuditMetricsView.as_view()),
  path("audit/alerts/", ThreatAlertListView.as_view()),
]
