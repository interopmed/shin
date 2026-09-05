from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Max, Q, F, DecimalField, ExpressionWrapper
from decimal import Decimal
from django.db.models.functions import ExtractYear, ExtractMonth
import calendar
from datetime import date
from django.utils import timezone
from .models import PaymentCategory, Payment, PaymentItem, Expense, ExpenseCategory, DoctorSettlement, Package, ChargeItem
from apps.lab.models import Lab
from .serializers import (
    PaymentCategorySerializer, PaymentSerializer, PaymentListSerializer, PaymentItemSerializer,
    ExpenseSerializer, ExpenseCategorySerializer, DoctorSettlementSerializer, ChargeItemSerializer
)

class ChargeItemViewSet(viewsets.ModelViewSet):
    queryset = ChargeItem.objects.all()
    serializer_class = ChargeItemSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['appointment', 'status', 'patient']


class PaymentCategoryViewSet(viewsets.ModelViewSet):
    queryset = PaymentCategory.objects.all()
    serializer_class = PaymentCategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category_type', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'created_at']


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method', 'patient', 'doctor', 'user']
    search_fields = ['invoice_id', 'patient__name', 'doctor__name']
    ordering_fields = ['payment_date', 'amount', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return PaymentListSerializer
        return PaymentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if date_from:
            queryset = queryset.filter(payment_date__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(payment_date__date__lte=date_to)

        return queryset
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get payment statistics"""
        date_param = request.query_params.get('date')
        
        if date_param:
            from datetime import datetime
            date = datetime.strptime(date_param, '%Y-%m-%d').date()
            payments = self.queryset.filter(payment_date__date=date, status='paid')
        else:
            today = timezone.now().date()
            payments = self.queryset.filter(payment_date__date=today, status='paid')
        
        total_amount = payments.aggregate(total=Sum('amount'))['total'] or 0
        total_count = payments.count()
        
        return Response({
            'total_amount': total_amount,
            'total_count': total_count,
            'average_amount': total_amount / total_count if total_count > 0 else 0
        })

    @action(detail=False, methods=['get'], url_path='monthly-summary')
    def monthly_summary(self, request):
        """Aggregate payments by month with pagination"""
        section = request.query_params.get('section')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        page = int(request.query_params.get('page', 1) or 1)
        page_size = int(request.query_params.get('page_size', 12) or 12)

        qs = Payment.objects.exclude(payment_date__isnull=True)

        if section:
            qs = qs.filter(Q(section__iexact=section) | Q(section__isnull=True) | Q(section=''))
        if date_from:
            qs = qs.filter(payment_date__date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__date__lte=date_to)

        aggregated = (
            qs
            .annotate(year=ExtractYear('payment_date'), month=ExtractMonth('payment_date'))
            .values('year', 'month')
            .annotate(
                total_amount=Sum('amount'),
                total_discount=Sum('discount'),
                total_commission=Sum(
                    ExpressionWrapper(
                        F('items__amount') * F('items__payment_category__d_commission') * Decimal('0.01'),
                        output_field=DecimalField(max_digits=12, decimal_places=2),
                    )
                ),
                total_tests=Count('id'),
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
                'total_tests': row.get('total_tests') or 0,
                'total_amount': float(row.get('total_amount') or 0),
                'total_discount': float(row.get('total_discount') or 0),
                'total_commission': float(row.get('total_commission') or 0),
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


class PaymentItemViewSet(viewsets.ModelViewSet):
    queryset = PaymentItem.objects.all()
    serializer_class = PaymentItemSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['payment', 'payment_category']
    ordering_fields = ['created_at']

    def _resolve_lab_ids(self, payment_category: PaymentCategory) -> list[str]:
        if payment_category.package:
            package = Package.objects.filter(payment_category=payment_category).first()
            if package and package.content:
                return [token.strip() for token in package.content.split(',') if token.strip()]

        if payment_category.lab_id:
            return [str(payment_category.lab_id)]

        return []

    def _next_lab_id(self) -> int:
        max_id = Lab.objects.aggregate(max_id=Max('id')).get('max_id') or 0
        return max_id + 1

    def _create_lab_entries(self, payment: Payment, payment_category: PaymentCategory) -> None:
        category_type = (payment_category.category_type or '').strip().lower()
        section = (payment_category.section or '').strip().lower()
        if category_type != 'lab' and section != 'lab':
            return

        lab_ids = self._resolve_lab_ids(payment_category)
        if not lab_ids:
            return

        now = timezone.now()
        next_id = self._next_lab_id()
        doctor_value = str(payment.doctor_id) if payment.doctor_id else 'self_request'
        patient_value = str(payment.patient_id) if payment.patient_id else ''
        collected_time = payment.collected_time_string or now
        received_time = payment.received_time_string or now

        entries = []
        for lab_id in lab_ids:
            entries.append(Lab(
                id=next_id,
                lab_order_id=payment.id,
                date=str(int(now.timestamp())),
                category=lab_id,
                patient=patient_value,
                doctor=doctor_value,
                clinical_history=payment.clinical_history or '',
                special_notes='',
                date_string=now,
                collected_time_string=collected_time,
                received_time_string=received_time,
                status='Pending',
                user=str(getattr(self.request.user, 'id', '') or ''),
            ))
            next_id += 1

        if entries:
            Lab.objects.bulk_create(entries)
            if payment.processing_status == 0:
                payment.processing_status = 1
                payment.save(update_fields=['processing_status'])

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        try:
            payment_item_id = response.data.get('id')
            if not payment_item_id:
                return response
            payment_item = PaymentItem.objects.select_related('payment', 'payment_category').get(id=payment_item_id)
            if payment_item.payment and payment_item.payment_category:
                self._create_lab_entries(payment_item.payment, payment_item.payment_category)
        except Exception:
            pass
        return response


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'date', 'user']
    search_fields = ['description', 'reference']
    ordering_fields = ['date', 'amount', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset
    
    @action(detail=False, methods=['get'])
    def total(self, request):
        """Get total expenses"""
        date_param = request.query_params.get('date')
        
        if date_param:
            from datetime import datetime
            date = datetime.strptime(date_param, '%Y-%m-%d').date()
            expenses = self.queryset.filter(date=date)
        else:
            today = timezone.now().date()
            expenses = self.queryset.filter(date=today)
        
        total = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({'total': total, 'count': expenses.count()})


class DoctorSettlementViewSet(viewsets.ModelViewSet):
    queryset = DoctorSettlement.objects.all()
    serializer_class = DoctorSettlementSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['doctor', 'date']
    ordering_fields = ['date', 'amount', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        doctor = self.request.query_params.get('doctor')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if doctor:
            qs = qs.filter(doctor_id=doctor)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        doctor_id = request.query_params.get('doctor')
        if not doctor_id:
            return Response({'error': 'doctor parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        payment_filters = Q(doctor_id=doctor_id) & (
            Q(section__iexact='lab') | Q(section__isnull=True) | Q(section='')
        )

        payments_qs = Payment.objects.filter(payment_filters)
        settlements_qs = DoctorSettlement.objects.filter(doctor_id=doctor_id)

        if date_from:
            payments_qs = payments_qs.filter(payment_date__date__gte=date_from)
            settlements_qs = settlements_qs.filter(date__gte=date_from)
        if date_to:
            payments_qs = payments_qs.filter(payment_date__date__lte=date_to)
            settlements_qs = settlements_qs.filter(date__lte=date_to)

        payments_agg = payments_qs.aggregate(
            total_amount=Sum('amount'),
            total_paid=Sum('paid_amount'),
            total_balance=Sum('balance'),
            count=Count('id'),
        )

        settlements_agg = settlements_qs.aggregate(
            total_settled=Sum('amount'),
            total_commission=Sum('commission'),
            settlement_count=Count('id'),
        )

        def _num(value):
            return float(value or 0)

        return Response({
            'total_amount': _num(payments_agg.get('total_amount')),
            'total_paid': _num(payments_agg.get('total_paid')),
            'total_balance': _num(payments_agg.get('total_balance')),
            'payment_count': payments_agg.get('count') or 0,
            'total_settled': _num(settlements_agg.get('total_settled')),
            'total_commission': _num(settlements_agg.get('total_commission')),
            'settlement_count': settlements_agg.get('settlement_count') or 0,
            'due': _num(payments_agg.get('total_amount')) - _num(settlements_agg.get('total_settled')),
        })
