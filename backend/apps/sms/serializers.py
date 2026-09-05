from rest_framework import serializers
from .models import SMSTemplate, SMSLog, SMSConfig


class SMSTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMSTemplate
        fields = '__all__'


class SMSLogSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    sent_by_name = serializers.CharField(source='sent_by.get_full_name', read_only=True)
    
    class Meta:
        model = SMSLog
        fields = '__all__'


class SMSConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMSConfig
        fields = '__all__'
