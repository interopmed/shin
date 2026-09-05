from django.db import models
from apps.patients.models import Patient
from apps.doctors.models import Doctor

class LabCategory(models.Model):
    """Maps to 'lab_category' table in lcd_dev.sql"""
    category = models.CharField(max_length=100, blank=True, default='')  # Short code
    name = models.CharField(max_length=100)  # Full name
    department = models.CharField(max_length=20, blank=True, default='')  # Haematology, Biochemistry, etc.
    description = models.CharField(max_length=100, blank=True)
    
    # Reference values (for simple tests)
    ref_val_lower = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    ref_val_upper = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    unit = models.CharField(max_length=100, blank=True)
    
    # Subcategory configuration
    subcategory_status = models.IntegerField(default=0)  # 0 or 1
    subcategories = models.CharField(max_length=200, blank=True)
    
    # Reference configuration
    separate_ref = models.IntegerField(default=0)  # Has separate reference table
    processing_method = models.CharField(max_length=11, blank=True)  # 'self', 'outside', etc.

    class Meta:
        db_table = 'lab_category'
        
    def __str__(self):
        return self.name

class LabSection(models.Model):
    """Maps to 'lab_section' table - sections within a category"""
    name = models.CharField(max_length=50)
    category = models.IntegerField()  # Category ID
    section = models.IntegerField()  # Section number
    calculated = models.IntegerField(default=0)  # Is this section calculated?
    
    class Meta:
        db_table = 'lab_section'
        
    def __str__(self):
        return f"{self.name} (Category {self.category}, Section {self.section})"

class LabSubcategory(models.Model):
    """Maps to 'lab_subcategory' table - individual test parameters"""
    category_id = models.IntegerField()  # Reference to LabCategory
    name = models.CharField(max_length=100)  # Parameter name
    display_name = models.CharField(max_length=50)
    
    # Reference values
    ref_val_lower = models.CharField(max_length=20, blank=True)
    ref_val_upper = models.CharField(max_length=20, blank=True)
    ref_val_lower_f = models.CharField(max_length=20, blank=True)  # Female
    ref_val_upper_f = models.CharField(max_length=20, blank=True)  # Female
    ref_val_sub_1 = models.CharField(max_length=20, blank=True)
    ref_val_sub_2 = models.CharField(max_length=20, blank=True)
    
    unit = models.CharField(max_length=100, blank=True)
    section = models.IntegerField(default=0)  # Section ID
    notes = models.CharField(max_length=500, blank=True)
    calc_status = models.CharField(max_length=1000, blank=True)  # JSON for calculation logic
    
    class Meta:
        db_table = 'lab_subcategory'
        
    def __str__(self):
        return self.display_name

class LabSeparateRef(models.Model):
    """Maps to 'lab_separate_ref' table - complex reference ranges"""
    id = models.IntegerField(primary_key=True)
    category = models.IntegerField()  # Category ID
    subcategory = models.IntegerField()  # Subcategory ID
    value = models.CharField(max_length=5000)  # JSON with reference data
    new_ref = models.CharField(max_length=500, blank=True)
    old_ref = models.CharField(max_length=500, blank=True, null=True)
    
    class Meta:
        db_table = 'lab_separate_ref'
        
    def __str__(self):
        return f"Reference for Category {self.category}"

class Lab(models.Model):
    """Maps to 'lab' table - individual lab test records"""
    id = models.IntegerField(primary_key=True)
    lab_order_id = models.IntegerField()  # Reference to order/invoice
    date = models.CharField(max_length=100)  # Unix timestamp as string
    category = models.CharField(max_length=100)  # Category ID
    patient = models.CharField(max_length=100)  # Patient ID
    doctor = models.CharField(max_length=100)  # Doctor ID
    
    # Clinical information
    clinical_history = models.CharField(max_length=100, blank=True)
    special_notes = models.CharField(max_length=500, blank=True)
    
    # Timestamps
    date_string = models.DateTimeField()
    collected_time_string = models.DateTimeField()
    received_time_string = models.DateTimeField()
    
    status = models.CharField(max_length=100, blank=True)
    user = models.CharField(max_length=100, blank=True)  # User ID who created
    
    class Meta:
        db_table = 'lab'
        
    def __str__(self):
        return f"Lab Test #{self.id} - Order {self.lab_order_id}"

class LabTestValue(models.Model):
    """Maps to 'lab_test_value' table - stores actual test results"""
    id = models.IntegerField(primary_key=True)
    lab_order_id = models.IntegerField()  # Reference to order
    category = models.CharField(max_length=100)  # Category ID
    subcategory = models.CharField(max_length=100)  # Subcategory/parameter ID
    value = models.CharField(max_length=50)  # Test result value
    flag = models.CharField(max_length=50, blank=True)  # HIGH, LOW, NORMAL, etc.
    
    class Meta:
        db_table = 'lab_test_value'
        
    def __str__(self):
        return f"Value for order {self.lab_order_id}: {self.value}"

# Keep the original models for compatibility with existing code
class LabTestDefinition(models.Model):
    """
    Defines a specific test that can be ordered.
    This is a simplified view combining category and subcategory.
    """
    category = models.ForeignKey(LabCategory, on_delete=models.CASCADE, related_name='tests')
    name = models.CharField(max_length=255)
    reference_range = models.CharField(max_length=255, blank=True)
    unit = models.CharField(max_length=50, blank=True)
    internal_code = models.CharField(max_length=50, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.category.name} - {self.name}"

class LabOrder(models.Model):
    """Simplified lab order model for API compatibility"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_orders')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_orders')
    order_date = models.DateTimeField(auto_now_add=True)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Lab Order #{self.id} for {self.patient.name}"

class LabResult(models.Model):
    """Simplified result model for API compatibility"""
    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='results')
    test = models.ForeignKey(LabTestDefinition, on_delete=models.CASCADE, related_name='results')
    value = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    result_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for {self.test.name}: {self.value}"



