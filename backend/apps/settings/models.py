from django.contrib.auth.models import Group
from django.db import models


class SystemSetting(models.Model):
    """System-wide settings"""
    
    key = models.CharField(max_length=255, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_setting'
        
    def __str__(self):
        return self.key


class CompanyInfo(models.Model):
    """Company/Organization information"""
    
    name = models.CharField(max_length=255)
    address = models.TextField()
    phone = models.CharField(max_length=100)
    email = models.EmailField()
    
    website = models.URLField(blank=True)
    logo = models.CharField(max_length=255, blank=True)
    
    tax_number = models.CharField(max_length=100, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'company_info'
        
    def __str__(self):
        return self.name


class EmailTemplate(models.Model):
    """Email templates for notifications"""
    
    name = models.CharField(max_length=255, unique=True)
    subject = models.CharField(max_length=500)
    body = models.TextField()
    
    variables = models.TextField(help_text="Available template variables (JSON)", blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'email_template'
        
    def __str__(self):
        return self.name


class Menu(models.Model):
    """Top-level navigation entries."""

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    groups = models.ManyToManyField(Group, related_name="menus", blank=True)

    class Meta:
        db_table = "menu"

    def __str__(self):
        return self.name


class MenuSub(models.Model):
    """Second-level navigation entries."""

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    menu = models.ForeignKey(
        Menu,
        to_field="name",
        db_column="menu",
        on_delete=models.CASCADE,
        related_name="sub_menus",
    )
    value = models.TextField(blank=True, default="")
    link = models.CharField(max_length=250, blank=True, default="")
    color = models.CharField(max_length=100, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    groups = models.ManyToManyField(Group, related_name="menu_subs", blank=True)

    class Meta:
        db_table = "menu_sub"

    def __str__(self):
        return f"{self.menu_id}:{self.name}"
