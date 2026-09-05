from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyInfoViewSet,
    EmailTemplateViewSet,
    GroupViewSet,
    MenuSubViewSet,
    MenuViewSet,
    SystemSettingViewSet,
)

router = DefaultRouter()
router.register(r'system-settings', SystemSettingViewSet)
router.register(r'company-info', CompanyInfoViewSet)
router.register(r'email-templates', EmailTemplateViewSet)
router.register(r'groups', GroupViewSet)
router.register(r'menus', MenuViewSet)
router.register(r'menu-subs', MenuSubViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
