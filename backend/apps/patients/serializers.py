from rest_framework import serializers
from apps.core.serializers import PatientSerializer
from .models import PatientMaterial, Admission

class PatientMaterialSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_code = serializers.CharField(source='patient.patient_id', read_only=True)

    class Meta:
        model = PatientMaterial
        fields = '__all__'

class AdmissionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_age = serializers.CharField(source='patient.age', read_only=True)
    patient_gender = serializers.CharField(source='patient.sex', read_only=True)

    class Meta:
        model = Admission
        fields = '__all__'
