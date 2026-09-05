from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SMSTemplateViewSet, SMSLogViewSet, SMSConfigViewSet

router = DefaultRouter()
router.register(r'templates', SMSTemplateViewSet)
router.register(r'logs', SMSLogViewSet)
router.register(r'configs', SMSConfigViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
