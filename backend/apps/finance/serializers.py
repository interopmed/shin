from rest_framework import serializers
from .models import PaymentCategory, Payment, PaymentItem, Expense, ExpenseCategory, DoctorSettlement, Package, ChargeItem


class ChargeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChargeItem
        fields = '__all__'
        read_only_fields = ['entered_at', 'updated_at']


class PaymentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentCategory
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class PaymentItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='payment_category.name', read_only=True, allow_null=True)
    
    class Meta:
        model = PaymentItem
        fields = '__all__'
        read_only_fields = ['created_at']


class PaymentListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True, allow_null=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'invoice_id', 'reference_number', 'patient_name', 'doctor_name',
            'amount', 'paid_amount', 'balance', 'payment_method', 'status', 'payment_date',
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True, allow_null=True)
    items = PaymentItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.email', read_only=True, allow_null=True)
    
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class DoctorSettlementSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    
    class Meta:
        model = DoctorSettlement
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
