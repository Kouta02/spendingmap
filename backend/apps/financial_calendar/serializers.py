from rest_framework import serializers

from .models import CreditCard, PaymentDate


class PaymentDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentDate
        fields = ['id', 'year', 'month', 'payment_day', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentDateBulkItemSerializer(serializers.Serializer):
    month = serializers.IntegerField(min_value=1, max_value=12)
    payment_day = serializers.IntegerField(min_value=1, max_value=31)


class PaymentDateBulkSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    dates = PaymentDateBulkItemSerializer(many=True)

    def validate_dates(self, value):
        months = [d['month'] for d in value]
        if len(months) != len(set(months)):
            raise serializers.ValidationError('Meses duplicados não são permitidos.')
        return value


class CreditCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditCard
        fields = [
            'id', 'name', 'closing_day', 'due_day',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FinancialMonthSerializer(serializers.Serializer):
    month = serializers.IntegerField()
    label = serializers.CharField()
    start = serializers.DateField()
    end = serializers.DateField()
