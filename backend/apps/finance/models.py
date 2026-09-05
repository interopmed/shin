from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.lab.models import LabOrder
from apps.appointment.models import Appointment


class PaymentCategory(models.Model):
    """Payment categories for services"""

    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    category_type = models.CharField(max_length=50, default='lab')  # lab, consultation, etc

    # Legacy fields from MySQL payment_category
    lab_id = models.IntegerField(default=0)
    section = models.CharField(max_length=50, blank=True, default='')
    package = models.IntegerField(default=0)
    service_type = models.CharField(max_length=100, blank=True, default='', db_column='type')
    d_commission = models.IntegerField(default=0)
    h_commission = models.IntegerField(default=0)
    processing_method = models.CharField(max_length=10, blank=True, default='')

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_category'
        verbose_name_plural = 'Payment Categories'
        
    def __str__(self):
        return f"{self.name} - Rs. {self.price}"


class Package(models.Model):
    """Lab package definitions (legacy packages table)."""

    name = models.CharField(max_length=100)
    payment_category = models.ForeignKey(
        PaymentCategory,
        on_delete=models.CASCADE,
        related_name="packages",
        db_column="payment_category",
    )
    content = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        db_table = 'packages'

    def __str__(self):
        return self.name


class Payment(models.Model):
    """Payment/Invoice model"""
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('bank', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('online', 'Online'),
    ]
    
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    invoice_id = models.CharField(max_length=50, unique=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='payments')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Lab order relation
    lab_order = models.ForeignKey(LabOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    
    # Payment details
    gross_total = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Final amount
    
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    doctor_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='paid')
    
    # Additional info
    remarks = models.TextField(blank=True, null=True)
    reference_number = models.CharField(max_length=100, blank=True, null=True)

    section = models.CharField(max_length=50, blank=True, default='')
    clinical_history = models.TextField(blank=True, null=True)
    collected_time_string = models.DateTimeField(blank=True, null=True)
    received_time_string = models.DateTimeField(blank=True, null=True)
    processing_status = models.IntegerField(default=0)
    
    payment_date = models.DateTimeField(blank=True, null=True, default=timezone.now)
    created_at = models.DateTimeField(blank=True, null=True, default=timezone.now)
    updated_at = models.DateTimeField(blank=True, null=True, default=timezone.now)
    
    class Meta:
        db_table = 'payment'
        ordering = ['-payment_date']
        
    def __str__(self):
        return f"Invoice {self.invoice_id} - {self.patient.name} - Rs. {self.amount}"

    def save(self, *args, **kwargs):
        now = timezone.now()
        if not self.payment_date:
            self.payment_date = now
        if not self.created_at:
            self.created_at = now

        if self.pk:
            # On updates, refresh updated_at to now
            self.updated_at = now
        elif not self.updated_at:
            # On create, set updated_at only if not already provided (e.g., during imports)
            self.updated_at = now

        super().save(*args, **kwargs)


class ChargeItem(models.Model):
    """Clinical charge items generated at the point of care"""
    STATUS_CHOICES = [
        ('billable', 'Billable'),
        ('billed', 'Billed'),
        ('entered-in-error', 'Entered in Error')
    ]

    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='charge_items')
    performer = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='performed_charges')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='charge_items')
    
    code = models.CharField(max_length=50, blank=True, default='')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='billable')
    
    entered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'charge_item'
        ordering = ['-entered_at']
        
    def __str__(self):
        return f"Charge: {self.description} - Rs. {self.amount}"


class PaymentItem(models.Model):
    """Individual items in a payment"""
    
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='items')
    payment_category = models.ForeignKey(PaymentCategory, on_delete=models.SET_NULL, null=True, blank=True)
    
    description = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_item'
        
    def __str__(self):
        return f"{self.description} - Rs. {self.amount}"


class Expense(models.Model):
    """Expense tracking"""
    
    category = models.ForeignKey('ExpenseCategory', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    date = models.DateField()
    reference = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'expense'
        ordering = ['-date']
        
    def __str__(self):
        return f"{self.description} - Rs. {self.amount}"


class ExpenseCategory(models.Model):
    """Expense categories"""
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'expense_category'
        verbose_name_plural = 'Expense Categories'
        
    def __str__(self):
        return self.name


class DoctorSettlement(models.Model):
    """Doctor payment settlements"""
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='settlements')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date = models.DateField()
    
    remarks = models.TextField(blank=True, null=True)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'doctor_settlements'
        ordering = ['-date']
        
    def __str__(self):
        return f"Dr. {self.doctor.name} - Rs. {self.amount} - {self.date}"
