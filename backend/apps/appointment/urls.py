from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, ScheduleViewSet, HolidayViewSet

router = DefaultRouter()
router.register(r'appointments', AppointmentViewSet)
router.register(r'schedules', ScheduleViewSet)
router.register(r'holidays', HolidayViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
