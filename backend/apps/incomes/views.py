from django_filters import rest_framework as filters
from rest_framework.viewsets import ModelViewSet

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
        fields = ['category', 'bank', 'is_recurring']

    def filter_by_month(self, queryset, name, value):
        try:
            year, month = value.split('-')
            return queryset.filter(date__year=int(year), date__month=int(month))
        except (ValueError, AttributeError):
            return queryset


class IncomeViewSet(ModelViewSet):
    queryset = Income.objects.select_related('category', 'bank').all()
    serializer_class = IncomeSerializer
    filterset_class = IncomeFilter
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    search_fields = ['description', 'notes']
