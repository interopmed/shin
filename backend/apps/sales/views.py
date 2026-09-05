from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import date
from django.db.models import Sum, Count
from django.db.models.functions import ExtractYear, ExtractMonth
import calendar
from .models import Sale, SaleItem
from .serializers import SaleSerializer, SaleItemSerializer
from apps.finance.models import Expense


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related('patient', 'user').prefetch_related('items').all()
    serializer_class = SaleSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'payment_method', 'sale_date']
    search_fields = ['sale_id', 'patient__name', 'payment_method']
    ordering_fields = ['sale_date', 'total_amount']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(sale_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(sale_date__date__lte=end_date)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's sales"""
        today_sales = self.queryset.filter(sale_date__date=date.today())
        serializer = self.get_serializer(today_sales, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get sales summary"""
        total_sales = self.queryset.aggregate(
            total_amount=Sum('total_amount'),
            total_paid=Sum('paid_amount')
        )
        return Response(total_sales)

    @action(detail=False, methods=['get'])
    def financial_report(self, request):
        """Get financial report (excluding lab)"""
        # Income by stock category
        income_data = SaleItem.objects.select_related('stock__category').exclude(
            stock__category__name__icontains='lab'
        ).values('stock__category__name').annotate(
            total_quantity=Sum('quantity'),
            total_amount=Sum('total_price')
        ).order_by('-total_amount')

        # Expenses by expense category
        expenses_data = Expense.objects.select_related('category').values(
            'category__name'
        ).annotate(
            total_amount=Sum('amount')
        ).order_by('-total_amount')

        # Calculate totals
        total_income = sum(item['total_amount'] or 0 for item in income_data)
        total_expenses = sum(item['total_amount'] or 0 for item in expenses_data)
        net_profit = total_income - total_expenses

        return Response({
            'income': income_data,
            'expenses': expenses_data,
            'summary': {
                'total_income': total_income,
                'total_expenses': total_expenses,
                'net_profit': net_profit
            }
        })

    @action(detail=False, methods=['get'])
    def monthly_report(self, request):
        """Monthly sales report (excluding lab)"""
        page = int(request.query_params.get('page', 1) or 1)
        page_size = int(request.query_params.get('page_size', 12) or 12)

        # Aggregate based on SaleItem to properly exclude lab categories
        # Then group by month/year of the sale
        qs = SaleItem.objects.select_related('sale', 'stock__category').exclude(
            stock__category__name__icontains='lab'
        )

        aggregated = (
            qs
            .annotate(
                year=ExtractYear('sale__sale_date'), 
                month=ExtractMonth('sale__sale_date')
            )
            .values('year', 'month')
            .annotate(
                total_amount=Sum('total_price'),
                total_discount=Sum('discount'),
                total_items=Count('id'),
                unique_sales=Count('sale', distinct=True) # Count unique sales involved
            )
            .order_by('-year', '-month')
        )

        results = []
        for row in aggregated:
            year = int(row.get('year') or 0)
            month = int(row.get('month') or 0)
            if not year or not month:
                continue
            
            last_day = calendar.monthrange(year, month)[1]
            start_date = date(year, month, 1)
            end_date = date(year, month, last_day)

            results.append({
                'label': f"{year}-{str(month).zfill(2)}",
                'year': year,
                'month': month,
                'date_from': start_date.isoformat(),
                'date_to': end_date.isoformat(),
                'total_tests': row.get('unique_sales') or 0, # Renamed to fit interface or just indicate count
                'total_amount': float(row.get('total_amount') or 0),
                'total_discount': float(row.get('total_discount') or 0),
                'total_commission': 0, # No commission logic for sales yet
                'total_items': row.get('total_items') or 0
            })

        total = len(results)
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        paginated = results[start:end]

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': paginated,
        })


class SaleItemViewSet(viewsets.ModelViewSet):
    queryset = SaleItem.objects.select_related('sale', 'stock').all()
    serializer_class = SaleItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sale', 'stock']
    search_fields = ['stock__name', 'batch_number']
    ordering_fields = ['created_at']
