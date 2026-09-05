from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, PatientCountView, PatientMaterialViewSet, PatientSearchView

router = DefaultRouter()
router.register(r'patient-materials', PatientMaterialViewSet)

urlpatterns = [
    path('patients/count/', PatientCountView.as_view(), name='patient-count'),
    path('patients/search/', PatientSearchView.as_view(), name='patient-search'),
    path('', include(router.urls)),
]
