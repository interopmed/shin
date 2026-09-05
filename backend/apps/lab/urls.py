from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LabCategoryViewSet,
    LabTestDefinitionViewSet,
    LabOrderViewSet,
    LabResultViewSet,
)

router = DefaultRouter()
router.register(r'categories', LabCategoryViewSet)
router.register(r'definitions', LabTestDefinitionViewSet)
router.register(r'orders', LabOrderViewSet)
router.register(r'results', LabResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
