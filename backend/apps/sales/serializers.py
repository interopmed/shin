from rest_framework import serializers
from .models import Sale, SaleItem


import uuid

class SaleItemSerializer(serializers.ModelSerializer):
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    # sale field is read_only, so it's not required in the input payload
    sale = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = SaleItem
        fields = ['id', 'stock', 'stock_name', 'sale', 'quantity', 'unit_price', 'discount', 'total_price', 'batch_number']

class SaleSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    items = SaleItemSerializer(many=True)
    sale_id = serializers.CharField(read_only=True)
    
    class Meta:
        model = Sale
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Auto-generate a sale_id if not provided
        if 'sale_id' not in validated_data:
            validated_data['sale_id'] = f"SL-{uuid.uuid4().hex[:8].upper()}"
            
        sale = Sale.objects.create(**validated_data)
        for item_data in items_data:
            SaleItem.objects.create(sale=sale, **item_data)
        return sale

    def update(self, instance, validated_data):
        # This example only implements create for nested items.
        # A full implementation would also handle updates and deletions of nested items.
        items_data = validated_data.pop('items', None)

        instance.patient = validated_data.get('patient', instance.patient)
        instance.user = validated_data.get('user', instance.user)
        instance.sale_date = validated_data.get('sale_date', instance.sale_date)
        instance.total_amount = validated_data.get('total_amount', instance.total_amount)
        instance.payment_status = validated_data.get('payment_status', instance.payment_status)
        instance.remarks = validated_data.get('remarks', instance.remarks)
        instance.save()

        if items_data is not None:
            # Clear existing items and recreate. More robust logic would compare and update.
            instance.items.all().delete()
            for item_data in items_data:
                SaleItem.objects.create(sale=instance, **item_data)

        return instance
