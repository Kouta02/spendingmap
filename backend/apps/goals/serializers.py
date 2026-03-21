from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from apps.expenses.models import Expense
from .models import Goal


class GoalSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.full_path', read_only=True, default=None)
    current_spending = serializers.SerializerMethodField()
    percentage = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = [
            'id', 'name', 'category', 'category_name', 'amount_limit', 'month',
            'current_spending', 'percentage', 'status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def _get_spending(self, obj: Goal) -> Decimal:
        filters = {
            'date__year': obj.month.year,
            'date__month': obj.month.month,
        }
        if obj.category:
            filters['category'] = obj.category
        total = Expense.objects.filter(**filters).aggregate(
            total=Sum('amount')
        )['total']
        return total or Decimal('0')

    def get_current_spending(self, obj: Goal) -> str:
        return str(self._get_spending(obj))

    def get_percentage(self, obj: Goal) -> float:
        spending = self._get_spending(obj)
        if obj.amount_limit <= 0:
            return 0
        return round(float(spending / obj.amount_limit * 100), 1)

    def get_status(self, obj: Goal) -> str:
        """Retorna: 'ok', 'alerta' (>=80%) ou 'excedido' (>=100%)."""
        pct = self.get_percentage(obj)
        if pct >= 100:
            return 'excedido'
        if pct >= 80:
            return 'alerta'
        return 'ok'
