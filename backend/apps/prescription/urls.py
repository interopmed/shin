from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PrescriptionViewSet, PrescriptionMedicineViewSet

router = DefaultRouter()
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'medicines', PrescriptionMedicineViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
