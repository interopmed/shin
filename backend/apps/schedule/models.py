from django.db import models
from apps.doctors.models import Doctor
from django.contrib.auth.models import User


class WorkSchedule(models.Model):
    """Doctor/Staff work schedule"""
    
    DAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, null=True, blank=True, related_name='work_schedules')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='work_schedules')
    
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    break_start = models.TimeField(null=True, blank=True)
    break_end = models.TimeField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'work_schedule'
        unique_together = ['doctor', 'user', 'day_of_week']
        
    def __str__(self):
        if self.doctor:
            return f"{self.doctor.name} - {self.day_of_week}"
        return f"{self.user.get_full_name()} - {self.day_of_week}"


class TimeSlot(models.Model):
    """Available time slots for appointments"""
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='time_slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    is_available = models.BooleanField(default=True)
    max_patients = models.IntegerField(default=1)
    booked_patients = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'time_slot'
        unique_together = ['doctor', 'date', 'start_time']
        ordering = ['date', 'start_time']
        
    def __str__(self):
        return f"{self.doctor.name} - {self.date} {self.start_time}-{self.end_time}"
    
    @property
    def is_full(self):
        return self.booked_patients >= self.max_patients
