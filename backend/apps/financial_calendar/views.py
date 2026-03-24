from rest_framework import status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import CreditCard, PaymentDate
from .serializers import (
    CreditCardSerializer,
    FinancialMonthSerializer,
    PaymentDateBulkSerializer,
    PaymentDateSerializer,
)
from .services import build_financial_months, get_financial_month_for_date


class PaymentDateViewSet(ModelViewSet):
    queryset = PaymentDate.objects.all()
    serializer_class = PaymentDateSerializer

    @action(detail=False, methods=['get'])
    def by_year(self, request):
        """Retorna as datas de pagamento de um ano específico."""
        year = request.query_params.get('year')
        if not year:
            return Response(
                {'detail': 'Parâmetro "year" é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = self.queryset.filter(year=int(year))
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """Cadastra/atualiza as datas de pagamento de um ano inteiro."""
        serializer = PaymentDateBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        year = serializer.validated_data['year']
        dates = serializer.validated_data['dates']

        results = []
        for item in dates:
            obj, _created = PaymentDate.objects.update_or_create(
                year=year,
                month=item['month'],
                defaults={'payment_day': item['payment_day']},
            )
            results.append(obj)

        # Recalcular o mês financeiro de todas as despesas do ano
        self._recalculate_financial_months(year)

        return Response(
            PaymentDateSerializer(results, many=True).data,
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _recalculate_financial_months(year):
        from apps.expenses.models import Expense
        from .services import get_credit_card_financial_month, get_financial_month_for_date

        expenses = Expense.objects.filter(
            date__year=year,
        ).select_related('credit_card')

        for exp in expenses:
            if exp.credit_card:
                new_fm = get_credit_card_financial_month(exp.date, exp.credit_card)
            else:
                new_fm = get_financial_month_for_date(exp.date)

            if exp.financial_month != new_fm:
                exp.financial_month = new_fm
                exp.save(update_fields=['financial_month'])


class CreditCardViewSet(ModelViewSet):
    queryset = CreditCard.objects.all()
    serializer_class = CreditCardSerializer
    search_fields = ['name']


@api_view(['GET'])
def financial_months_view(request):
    """Retorna os 12 meses financeiros calculados para o ano solicitado."""
    year = request.query_params.get('year')
    if not year:
        return Response(
            {'detail': 'Parâmetro "year" é obrigatório.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    months = build_financial_months(int(year))
    serializer = FinancialMonthSerializer(months, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def current_financial_month_view(request):
    """Retorna o mês financeiro corrente baseado na data de hoje."""
    from datetime import date as date_cls
    today = date_cls.today()
    fm = get_financial_month_for_date(today)
    return Response({
        'year': fm.year,
        'month': fm.month,
        'financial_month': fm.isoformat(),
    })
