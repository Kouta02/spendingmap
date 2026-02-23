from django_filters import rest_framework as filters

from .models import Expense


class ExpenseFilter(filters.FilterSet):
    month = filters.CharFilter(method='filter_by_month', label='Mês (YYYY-MM)')

    class Meta:
        model = Expense
        fields = ['category', 'bank', 'payment_type', 'is_installment', 'is_recurring', 'from_paycheck']

    def filter_by_month(self, queryset, name, value):
        try:
            year, month = value.split('-')
            return queryset.filter(date__year=int(year), date__month=int(month))
        except (ValueError, AttributeError):
            return queryset
