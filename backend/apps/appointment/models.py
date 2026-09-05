from django.db import models
from django.contrib.auth.models import User
from apps.patients.models import Patient
from apps.doctors.models import Doctor


class Appointment(models.Model):
    """Appointment model based on CodeIgniter appointment table"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('pending_confirmation', 'Pending Confirmation'),
        ('confirmed', 'Confirmed'),
        ('treated', 'Treated'),
        ('cancelled', 'Cancelled'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    date = models.DateTimeField()
    duration = models.IntegerField(help_text='Duration in minutes', default=30)
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    BILLING_STATUS_CHOICES = [
        ('unbilled', 'Unbilled'),
        ('pending_additional_payment', 'Pending Additional Payment'),
        ('settled', 'Settled')
    ]
    billing_status = models.CharField(max_length=50, choices=BILLING_STATUS_CHOICES, default='unbilled')
    remarks = models.TextField(blank=True, null=True)
    problem = models.TextField(blank=True, null=True)
    
    slot_time = models.TimeField(null=True, blank=True)
    request_date = models.DateTimeField(auto_now_add=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'appointment'
        ordering = ['-date']
        
    def __str__(self):
        return f"Appointment - {self.patient.name} with Dr. {self.doctor.name} on {self.date}"


class Schedule(models.Model):
    """Doctor schedule model"""
    
    DAYS_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='schedules')
    day = models.CharField(max_length=20, choices=DAYS_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration = models.IntegerField(help_text='Slot duration in minutes', default=30)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'schedule'
        unique_together = ['doctor', 'day', 'start_time']
        
    def __str__(self):
        return f"Dr. {self.doctor.name} - {self.day} {self.start_time}-{self.end_time}"


class Holiday(models.Model):
    """Holiday/Leave model"""
    
    name = models.CharField(max_length=255)
    date = models.DateField()
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, null=True, blank=True, related_name='holidays')
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'holidays'
        ordering = ['-date']
        
    def __str__(self):
        return f"{self.name} - {self.date}"
