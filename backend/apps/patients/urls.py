from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, PatientCountView, PatientMaterialViewSet, PatientSearchView, ImagingRequestViewSet

router = DefaultRouter()
router.register(r'patient-materials', PatientMaterialViewSet)
router.register(r'imaging-requests', ImagingRequestViewSet)

urlpatterns = [
    path('patients/count/', PatientCountView.as_view(), name='patient-count'),
    path('patients/search/', PatientSearchView.as_view(), name='patient-search'),
    path('', include(router.urls)),
]

