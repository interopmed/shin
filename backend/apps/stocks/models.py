from django.db import models
from django.contrib.auth.models import User


class StockCategory(models.Model):
    """Stock/Medicine categories"""
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stock_category'
        verbose_name_plural = 'Stock Categories'
        
    def __str__(self):
        return self.name


class Stock(models.Model):
    """Stock/Medicine inventory"""
    
    category = models.ForeignKey(StockCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='stocks')
    
    name = models.CharField(max_length=255)
    generic_name = models.CharField(max_length=255, blank=True, null=True)
    manufacturer = models.CharField(max_length=255, blank=True, null=True)
    
    # Inventory
    quantity = models.IntegerField(default=0)
    unit = models.CharField(max_length=50, default='pcs')
    reorder_level = models.IntegerField(default=10)
    
    # Pricing
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Additional info from import
    box = models.CharField(max_length=255, blank=True, null=True)
    effects = models.TextField(blank=True, null=True)
    item_number = models.CharField(max_length=255, blank=True, null=True)
    
    # Additional info
    batch_number = models.CharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateField(null=True, blank=True)
    barcode = models.CharField(max_length=100, blank=True, null=True, unique=True)
    
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stocks'
        ordering = ['name']
        
    def __str__(self):
        return f"{self.name} - {self.quantity} {self.unit}"
    
    @property
    def is_low_stock(self):
        return self.quantity <= self.reorder_level


class StockTransaction(models.Model):
    """Stock movements - IN/OUT"""
    
    TRANSACTION_TYPE_CHOICES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
    ]
    
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='transactions')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    batch_number = models.CharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    reference = models.CharField(max_length=100, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    
    transaction_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'stock_transaction'
        ordering = ['-transaction_date']
        
    def __str__(self):
        return f"{self.transaction_type} - {self.stock.name} - {self.quantity}"
