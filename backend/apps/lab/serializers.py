from rest_framework import serializers
from .models import (
    LabCategory, LabTestDefinition, LabOrder, LabResult,
    Lab, LabTestValue, LabSubcategory, LabSection
)


class LabCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LabCategory
        fields = '__all__'

class LabTestDefinitionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = LabTestDefinition
        fields = '__all__'

class LabSubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSubcategory
        fields = [
            'id',
            'category_id',
            'name',
            'display_name',
            'ref_val_lower',
            'ref_val_upper',
            'ref_val_lower_f',
            'ref_val_upper_f',
            'ref_val_sub_1',
            'ref_val_sub_2',
            'unit',
            'section',
            'notes',
            'calc_status',
        ]

class LabSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSection
        fields = ['id', 'category', 'section', 'name', 'calculated']

class LabResultSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.name', read_only=True)
    reference_range = serializers.CharField(source='test.reference_range', read_only=True)
    unit = serializers.CharField(source='test.unit', read_only=True)

    class Meta:
        model = LabResult
        fields = ['id', 'test', 'test_name', 'value', 'unit', 'reference_range', 'notes']

class LabOrderSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    results = LabResultSerializer(many=True, read_only=True)

    class Meta:
        model = LabOrder
        fields = ['id', 'patient', 'patient_name', 'doctor', 'doctor_name', 'order_date', 'is_paid', 'results']

# Serializers for imported lab data
class LabSerializer(serializers.ModelSerializer):
    """Serializer for the lab table (imported data)"""
    class Meta:
        model = Lab
        fields = '__all__'

class LabTestValueSerializer(serializers.ModelSerializer):
    """Serializer for the lab_test_value table (imported data)"""
    subcategory_name = serializers.SerializerMethodField()
    subcategory_display_name = serializers.SerializerMethodField()

    class Meta:
        model = LabTestValue
        fields = ['id', 'lab_order_id', 'category', 'subcategory', 'value', 'flag', 'subcategory_name', 'subcategory_display_name']

    def get_subcategory_name(self, obj):
        raw = (obj.subcategory or '').strip()
        if not raw:
            return ''

        if raw.isdigit():
            sub = LabSubcategory.objects.filter(id=int(raw)).only('name').first()
            return sub.name if sub else raw

        sub = LabSubcategory.objects.filter(name__iexact=raw).only('name').first()
        return sub.name if sub else raw

    def get_subcategory_display_name(self, obj):
        raw = (obj.subcategory or '').strip()
        if not raw:
            return ''

        if raw.isdigit():
            sub = LabSubcategory.objects.filter(id=int(raw)).only('display_name', 'name').first()
            return sub.display_name if sub else raw

        sub = LabSubcategory.objects.filter(name__iexact=raw).only('display_name', 'name').first()
        return sub.display_name if sub else raw
