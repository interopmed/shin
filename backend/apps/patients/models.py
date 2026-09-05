from django.db import models

class Patient(models.Model):
    name = models.CharField(max_length=255)
    class Meta:
        db_table = 'patient'


class MedicalHistory(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_history')
    title = models.CharField(max_length=255)
    description = models.TextField()
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Medical History for {self.patient.name} on {self.date}"

class DiagnosticReport(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='diagnostic_reports')
    report_date = models.DateField()
    report_type = models.CharField(max_length=255) # e.g., 'X-Ray', 'Blood Test'
    summary = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.report_type} report for {self.patient.name} on {self.report_date}"

class PatientMaterial(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    document = models.FileField(upload_to='patient_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    unique_id = models.CharField(max_length=100, blank=True, null=True)
from django.db import models

class Patient(models.Model):
    name = models.CharField(max_length=255)
    class Meta:
        db_table = 'patient'


class MedicalHistory(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_history')
    title = models.CharField(max_length=255)
    description = models.TextField()
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Medical History for {self.patient.name} on {self.date}"

class DiagnosticReport(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='diagnostic_reports')
    report_date = models.DateField()
    report_type = models.CharField(max_length=255) # e.g., 'X-Ray', 'Blood Test'
    summary = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.report_type} report for {self.patient.name} on {self.report_date}"

class PatientMaterial(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    document = models.FileField(upload_to='patient_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    unique_id = models.CharField(max_length=100, blank=True, null=True)
    url = models.CharField(max_length=255, blank=True, null=True)
    date = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"Document '{self.title}' for {self.patient.name}"

class Admission(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='admissions')
    bht = models.CharField(max_length=100, blank=True, null=True)
    bed = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=50, default='admitted')
    created_at = models.DateTimeField(auto_now_add=True)
    discharged_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Admission {self.bht} for {self.patient.name}"

class Vitals(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vitals')
    blood_pressure = models.CharField(max_length=50, blank=True, null=True)
    heart_rate = models.IntegerField(blank=True, null=True)
    temperature = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    spo2 = models.IntegerField(blank=True, null=True)
    respiratory_rate = models.IntegerField(blank=True, null=True)
    weight = models.CharField(max_length=50, blank=True, null=True)
    height = models.CharField(max_length=50, blank=True, null=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Vitals for {self.patient.name} on {self.recorded_at}"

class MedicationPrescription(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='patient_prescriptions')
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    route = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100, blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='active')
    prescribed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medication_name} for {self.patient.name}"

class LabOrder(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='patient_lab_orders')
    panels = models.JSONField(default=list, blank=True, null=True)
    individual_tests = models.TextField(blank=True, null=True)
    clinical_indications = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='pending')
    ordered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Lab Order for {self.patient.name} on {self.ordered_at}"

class ImagingRequest(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='imaging_requests')
    modality = models.CharField(max_length=100)
    priority = models.CharField(max_length=50, default='routine')
    body_part = models.CharField(max_length=255)
    clinical_indication = models.TextField()
    status = models.CharField(max_length=50, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.modality} Request for {self.patient.name}"

class Allergy(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='allergies')
    substance = models.CharField(max_length=255)
    reaction = models.CharField(max_length=255)
    severity = models.CharField(max_length=50)
    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Allergy to {self.substance} for {self.patient.name}"
