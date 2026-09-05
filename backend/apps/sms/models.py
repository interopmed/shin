from django.db import models
from django.contrib.auth.models import User


class SMSTemplate(models.Model):
    """SMS message templates"""
    
    name = models.CharField(max_length=255, unique=True)
    message = models.TextField(max_length=500)
    variables = models.TextField(help_text="Available template variables (JSON)", blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sms_template'
        
    def __str__(self):
        return self.name


class SMSLog(models.Model):
    """Logs of sent SMS messages"""
    
    to_number = models.CharField(max_length=255, default='')
    message = models.TextField()
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    ]
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    template = models.ForeignKey(SMSTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='logs')
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sms_sent')
    
    provider_response = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sms_log'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.to_number} - {self.status}"


class SMSConfig(models.Model):
    """SMS provider configuration"""
    
    provider = models.CharField(max_length=100)
    api_key = models.CharField(max_length=500)
    api_secret = models.CharField(max_length=500, blank=True)
    sender_id = models.CharField(max_length=20)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sms_config'
        
    def __str__(self):
        return f"{self.provider} - {self.sender_id}"
