import uuid
from datetime import timedelta

from dateutil.relativedelta import relativedelta
from rest_framework import serializers

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    bank_name = serializers.CharField(source='bank.name', read_only=True, default=None)

    class Meta:
        model = Expense
        fields = [
            'id', 'description', 'amount', 'date',
            'category', 'category_name',
            'payment_type',
            'bank', 'bank_name',
            'is_installment', 'installment_current', 'installment_total', 'installment_group_id',
            'is_recurring', 'from_paycheck',
            'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'installment_group_id', 'created_at', 'updated_at']

    def validate(self, data):
        if data.get('is_installment'):
            if not data.get('installment_total') or data['installment_total'] < 2:
                raise serializers.ValidationError(
                    {'installment_total': 'Despesa parcelada precisa de pelo menos 2 parcelas.'}
                )
        return data

    def create(self, validated_data):
        if validated_data.get('is_installment') and validated_data.get('installment_total', 0) >= 2:
            return self._create_installments(validated_data)
        return super().create(validated_data)

    def _create_installments(self, validated_data):
        total = validated_data['installment_total']
        group_id = uuid.uuid4()
        base_date = validated_data['date']
        expenses = []

        for i in range(1, total + 1):
            expense_data = {
                **validated_data,
                'installment_current': i,
                'installment_group_id': group_id,
                'date': base_date + relativedelta(months=i - 1),
            }
            expenses.append(Expense(**expense_data))

        created = Expense.objects.bulk_create(expenses)
        return created[0]
