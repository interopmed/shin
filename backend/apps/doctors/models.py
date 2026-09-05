from django.db import models
from apps.core.models import Employee

class Doctor(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='doctor_profile', null=True, blank=True)
    department = models.CharField(max_length=100, blank=True, default="")
    qualifications = models.CharField(max_length=50, blank=True, default="")
    speciality = models.CharField(max_length=100, blank=True, null=True, default="")
    notes = models.CharField(max_length=500, blank=True, default="")
    institute = models.IntegerField(default=0)


    class Meta:
        managed = False
        db_table = 'doctor'

    def __str__(self) -> str:
        return self.employee.full_name if self.employee else "Unknown Doctor"

    @property
    def name(self) -> str:
        return self.employee.full_name if self.employee else "Unknown Doctor"
