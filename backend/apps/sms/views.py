from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count
from .models import SMSTemplate, SMSLog, SMSConfig
from .serializers import SMSTemplateSerializer, SMSLogSerializer, SMSConfigSerializer


class SMSTemplateViewSet(viewsets.ModelViewSet):
    queryset = SMSTemplate.objects.all()
    serializer_class = SMSTemplateSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'message']
    ordering_fields = ['name', 'created_at']


class SMSLogViewSet(viewsets.ModelViewSet):
    queryset = SMSLog.objects.select_related('template', 'sent_by').all()
    serializer_class = SMSLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'template']
    search_fields = ['recipient', 'message']
    ordering_fields = ['created_at', 'sent_at']
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get SMS statistics"""
        stats = self.queryset.aggregate(
            total=Count('id'),
            sent=Count('id', filter=models.Q(status='sent')),
            delivered=Count('id', filter=models.Q(status='delivered')),
            failed=Count('id', filter=models.Q(status='failed'))
        )
        return Response(stats)


class SMSConfigViewSet(viewsets.ModelViewSet):
    queryset = SMSConfig.objects.all()
    serializer_class = SMSConfigSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'provider']
    search_fields = ['provider', 'sender_id']
    ordering_fields = ['provider', 'created_at']
