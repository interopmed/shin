from django.db import models
from django.contrib.auth.models import User
from apps.patients.models import Patient
from apps.stocks.models import Stock


class Sale(models.Model):
    """Medicine/Product sales"""
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('online', 'Online'),
        ('insurance', 'Insurance'),
    ]
    
    sale_id = models.CharField(max_length=50, unique=True)
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_processed')
    
    sale_date = models.DateTimeField(auto_now_add=True)
    
    subtotal = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    paid_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    change_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sale'
        ordering = ['-sale_date']
        
    def __str__(self):
        return f"Sale #{self.sale_id} - {self.total_amount}"


class SaleItem(models.Model):
    """Individual items in a sale"""
    
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT, related_name='sale_items')
    
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    batch_number = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sale_item'
        
    def __str__(self):
        return f"{self.stock.name} x {self.quantity}"
