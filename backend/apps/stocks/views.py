from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import date, timedelta
from .models import Stock, StockCategory, StockTransaction
from .serializers import StockSerializer, StockCategorySerializer, StockTransactionSerializer


class StockCategoryViewSet(viewsets.ModelViewSet):
    queryset = StockCategory.objects.all()
    serializer_class = StockCategorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.select_related('category').all()
    serializer_class = StockSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'generic_name', 'manufacturer', 'barcode']
    ordering_fields = ['name', 'quantity', 'expiry_date', 'created_at']
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get items with low stock"""
        low_stock_items = [stock for stock in self.queryset if stock.is_low_stock]
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expiring(self, request):
        """Get items expiring within 30 days"""
        today = date.today()
        thirty_days = today + timedelta(days=30)
        expiring_items = self.queryset.filter(
            expiry_date__isnull=False,
            expiry_date__lte=thirty_days,
            expiry_date__gte=today
        )
        serializer = self.get_serializer(expiring_items, many=True)
        return Response(serializer.data)


class StockTransactionViewSet(viewsets.ModelViewSet):
    queryset = StockTransaction.objects.select_related('stock', 'user').all()
    serializer_class = StockTransactionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['stock', 'transaction_type', 'user']
    search_fields = ['stock__name', 'reference', 'remarks']
    ordering_fields = ['transaction_date']
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get transaction summary"""
        total_in = sum(
            t.total_amount for t in self.queryset.filter(transaction_type='in')
        )
        total_out = sum(
            t.total_amount for t in self.queryset.filter(transaction_type='out')
        )
        return Response({
            'total_in': total_in,
            'total_out': total_out,
            'net': total_in - total_out
        })
