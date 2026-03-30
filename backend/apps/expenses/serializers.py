import uuid
from datetime import timedelta

from dateutil.relativedelta import relativedelta
from rest_framework import serializers

from apps.financial_calendar.services import (
    get_credit_card_financial_month,
    get_financial_month_for_date,
)

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    third_party_name = serializers.CharField(source='third_party.name', read_only=True, default=None)
    payment_type_name = serializers.CharField(source='payment_type.name', read_only=True, default=None)
    credit_card_name = serializers.CharField(source='credit_card.name', read_only=True, default=None)
    is_predicted = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Expense
        fields = [
            'id', 'description', 'amount', 'date',
            'category', 'category_name',
            'payment_type', 'payment_type_name',
            'third_party', 'third_party_name',
            'credit_card', 'credit_card_name',
            'financial_month',
            'is_installment', 'installment_current', 'installment_total', 'installment_group_id',
            'is_recurring', 'from_paycheck',
            'due_day', 'boleto_status',
            'notes', 'is_predicted',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'installment_group_id', 'financial_month', 'created_at', 'updated_at']

    def validate(self, data):
        if data.get('is_installment'):
            if not data.get('installment_total') or data['installment_total'] < 2:
                raise serializers.ValidationError(
                    {'installment_total': 'Despesa parcelada precisa de pelo menos 2 parcelas.'}
                )
        return data

    def _calc_financial_month(self, expense_date, credit_card=None):
        """Calcula o mês financeiro com base na data e no cartão (se houver)."""
        if credit_card:
            return get_credit_card_financial_month(expense_date, credit_card)
        return get_financial_month_for_date(expense_date)

    def create(self, validated_data):
        credit_card = validated_data.get('credit_card')

        if validated_data.get('is_installment') and validated_data.get('installment_total', 0) >= 2:
            return self._create_installments(validated_data)

        validated_data['financial_month'] = self._calc_financial_month(
            validated_data['date'], credit_card,
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        credit_card = validated_data.get('credit_card', instance.credit_card)
        expense_date = validated_data.get('date', instance.date)
        validated_data['financial_month'] = self._calc_financial_month(expense_date, credit_card)
        return super().update(instance, validated_data)

    def _create_installments(self, validated_data):
        total = validated_data['installment_total']
        group_id = uuid.uuid4()
        base_date = validated_data['date']
        credit_card = validated_data.get('credit_card')
        expenses = []

        for i in range(1, total + 1):
            installment_date = base_date + relativedelta(months=i - 1)
            expense_data = {
                **validated_data,
                'installment_current': i,
                'installment_group_id': group_id,
                'date': installment_date,
                'financial_month': self._calc_financial_month(installment_date, credit_card),
            }
            expenses.append(Expense(**expense_data))

        created = Expense.objects.bulk_create(expenses)
        return created[0]
