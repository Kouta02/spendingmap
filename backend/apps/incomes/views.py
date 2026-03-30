from datetime import date as date_type

from django_filters import rest_framework as filters
from rest_framework.viewsets import ModelViewSet

from apps.financial_calendar.services import get_financial_month_for_date

from .models import Income, IncomeCategory
from .serializers import IncomeSerializer, IncomeCategorySerializer


class IncomeCategoryViewSet(ModelViewSet):
    queryset = IncomeCategory.objects.all()
    serializer_class = IncomeCategorySerializer
    search_fields = ['name']


class IncomeFilter(filters.FilterSet):
    month = filters.CharFilter(method='filter_by_month', label='Mês (YYYY-MM)')

    class Meta:
        model = Income
        fields = ['category', 'third_party', 'is_recurring']

    def filter_by_month(self, queryset, name, value):
        try:
            year, month = value.split('-')
            return queryset.filter(financial_month=date_type(int(year), int(month), 1))
        except (ValueError, AttributeError):
            return queryset


class IncomeViewSet(ModelViewSet):
    queryset = Income.objects.select_related('category', 'third_party').all()
    serializer_class = IncomeSerializer
    filterset_class = IncomeFilter
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    search_fields = ['description', 'notes']

    def _set_financial_month(self, serializer):
        income_date = serializer.validated_data.get('date')
        if income_date:
            fm = get_financial_month_for_date(income_date)
            serializer.save(financial_month=fm)
        else:
            serializer.save()

    def perform_create(self, serializer):
        self._set_financial_month(serializer)

    def perform_update(self, serializer):
        self._set_financial_month(serializer)
