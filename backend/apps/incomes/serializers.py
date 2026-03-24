from rest_framework import serializers

from .models import Income, IncomeCategory


class IncomeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeCategory
        fields = ['id', 'name', 'icon', 'color', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class IncomeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    bank_name = serializers.CharField(source='bank.name', read_only=True, default=None)

    class Meta:
        model = Income
        fields = [
            'id', 'description', 'amount', 'date',
            'category', 'category_name',
            'bank', 'bank_name',
            'is_recurring', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
