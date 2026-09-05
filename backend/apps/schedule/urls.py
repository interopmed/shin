from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkScheduleViewSet, TimeSlotViewSet

router = DefaultRouter()
router.register(r'work-schedules', WorkScheduleViewSet)
router.register(r'time-slots', TimeSlotViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
