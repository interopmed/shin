from django.db import models
from apps.patients.models import Patient
from apps.doctors.models import Doctor

class Prescription(models.Model):
    """Prescription model"""
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='prescriptions')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='prescriptions')
    
    date = models.DateTimeField(auto_now_add=True)
    diagnosis = models.TextField(blank=True, null=True)
    complaints = models.TextField(blank=True, null=True)
    examination = models.TextField(blank=True, null=True)
    advice = models.TextField(blank=True, null=True)
    
    next_visit_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prescription'
        ordering = ['-date']
        
    def __str__(self):
        return f"Prescription for {self.patient.name} by Dr. {self.doctor.name} on {self.date}"


class PrescriptionMedicine(models.Model):
    """Medicines in a prescription"""
    
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='medicines')
    
    medicine_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    quantity = models.IntegerField(default=1)
    instructions = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'prescription_medicine'
        
    def __str__(self):
        return f"{self.medicine_name} - {self.dosage}"
