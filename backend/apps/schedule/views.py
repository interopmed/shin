from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import date
from .models import WorkSchedule, TimeSlot
from .serializers import WorkScheduleSerializer, TimeSlotSerializer


class WorkScheduleViewSet(viewsets.ModelViewSet):
    queryset = WorkSchedule.objects.select_related('doctor', 'user').all()
    serializer_class = WorkScheduleSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['doctor', 'user', 'day_of_week', 'is_active']
    search_fields = ['doctor__name', 'user__first_name', 'user__last_name']
    ordering_fields = ['day_of_week', 'start_time']


class TimeSlotViewSet(viewsets.ModelViewSet):
    queryset = TimeSlot.objects.select_related('doctor').all()
    serializer_class = TimeSlotSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['doctor', 'date', 'is_available']
    search_fields = ['doctor__name']
    ordering_fields = ['date', 'start_time']
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available time slots"""
        available_slots = self.queryset.filter(is_available=True, date__gte=date.today())
        serializer = self.get_serializer(available_slots, many=True)
        return Response(serializer.data)
