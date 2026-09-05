from rest_framework import serializers
from .models import WorkSchedule, TimeSlot


class WorkScheduleSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = WorkSchedule
        fields = '__all__'


class TimeSlotSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TimeSlot
        fields = '__all__'
