from rest_framework.viewsets import ModelViewSet

from .filters import ExpenseFilter
from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(ModelViewSet):
    queryset = Expense.objects.select_related('category', 'bank').all()
    serializer_class = ExpenseSerializer
    filterset_class = ExpenseFilter
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    search_fields = ['description', 'notes']
