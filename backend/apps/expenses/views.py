import calendar
from datetime import date, timedelta

from rest_framework import status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.financial_calendar.services import get_financial_month_for_date

from .filters import ExpenseFilter
from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(ModelViewSet):
    queryset = Expense.objects.select_related(
        'category', 'bank', 'payment_type', 'credit_card',
    ).all()
    serializer_class = ExpenseSerializer
    filterset_class = ExpenseFilter
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    search_fields = ['description', 'notes']

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        month_param = request.query_params.get('month')
        if not month_param:
            return response

        try:
            year, month = map(int, month_param.split('-'))
            target_fm = date(year, month, 1)
        except (ValueError, TypeError):
            return response

        today = date.today()

        # Buscar descrições únicas de recorrentes
        recurring_descriptions = (
            Expense.objects
            .filter(is_recurring=True)
            .values_list('description', flat=True)
            .distinct()
        )

        for desc in recurring_descriptions:
            # Já existe registro real para este mês financeiro?
            already_exists = Expense.objects.filter(
                is_recurring=True,
                description=desc,
                financial_month=target_fm,
            ).exists()

            if already_exists:
                continue

            # Buscar a instância mais recente desta recorrente
            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc)
                .select_related('category', 'bank', 'payment_type', 'credit_card')
                .order_by('-date')
                .first()
            )

            if not latest:
                continue

            # Só gerar para meses posteriores ao mês original da despesa
            latest_fm = latest.financial_month or date(latest.date.year, latest.date.month, 1)
            if target_fm <= latest_fm:
                continue

            # Calcular o dia correto
            max_day = calendar.monthrange(year, month)[1]
            day = min(latest.date.day, max_day)
            target_expense_date = date(year, month, day)

            fm = get_financial_month_for_date(target_expense_date)

            is_boleto = latest.payment_type and latest.payment_type.name.lower() == 'boleto'

            if is_boleto:
                # Boleto: criar como pendente
                due_day = latest.due_day or latest.date.day
                new_expense = Expense.objects.create(
                    description=latest.description,
                    amount=latest.amount,
                    date=target_expense_date,
                    category=latest.category,
                    payment_type=latest.payment_type,
                    bank=latest.bank,
                    credit_card=latest.credit_card,
                    financial_month=fm,
                    is_recurring=True,
                    from_paycheck=latest.from_paycheck,
                    due_day=due_day,
                    boleto_status='pending',
                    notes=latest.notes,
                )
                serializer = ExpenseSerializer(new_expense)
                response.data.append(serializer.data)
            elif target_expense_date <= today:
                # Não-boleto: criar registro real se data já passou
                new_expense = Expense.objects.create(
                    description=latest.description,
                    amount=latest.amount,
                    date=target_expense_date,
                    category=latest.category,
                    payment_type=latest.payment_type,
                    bank=latest.bank,
                    credit_card=latest.credit_card,
                    financial_month=fm,
                    is_recurring=True,
                    from_paycheck=latest.from_paycheck,
                    notes=latest.notes,
                )
                serializer = ExpenseSerializer(new_expense)
                response.data.append(serializer.data)
            else:
                # Data ainda não chegou — retornar como previsão (virtual)
                response.data.append({
                    'id': f'predicted-{latest.id}-{year}-{month}',
                    'description': latest.description,
                    'amount': str(latest.amount),
                    'date': target_expense_date.isoformat(),
                    'category': str(latest.category_id) if latest.category_id else None,
                    'category_name': latest.category.name if latest.category else None,
                    'payment_type': str(latest.payment_type_id) if latest.payment_type_id else None,
                    'payment_type_name': latest.payment_type.name if latest.payment_type else None,
                    'bank': str(latest.bank_id) if latest.bank_id else None,
                    'bank_name': latest.bank.name if latest.bank else None,
                    'credit_card': str(latest.credit_card_id) if latest.credit_card_id else None,
                    'credit_card_name': latest.credit_card.name if latest.credit_card else None,
                    'financial_month': fm.isoformat() if fm else None,
                    'is_installment': False,
                    'installment_current': None,
                    'installment_total': None,
                    'installment_group_id': None,
                    'is_recurring': True,
                    'from_paycheck': latest.from_paycheck,
                    'due_day': None,
                    'boleto_status': None,
                    'notes': latest.notes,
                    'is_predicted': True,
                    'created_at': None,
                    'updated_at': None,
                })

        # Reordenar por data desc
        response.data.sort(key=lambda x: x.get('date', ''), reverse=True)

        return response

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        """Marca um boleto como pago, permitindo ajustar o valor."""
        expense = self.get_object()
        new_amount = request.data.get('amount')
        if new_amount is not None:
            expense.amount = new_amount
        expense.boleto_status = 'paid'
        expense.save(update_fields=['boleto_status', 'amount'])
        serializer = self.get_serializer(expense)
        return Response(serializer.data)


@api_view(['GET'])
def boleto_alerts(request):
    """
    Retorna boletos pendentes com alertas baseados na proximidade do vencimento.
    Níveis: overdue, due_today, due_3_days, due_5_days
    """
    today = date.today()

    # Boletos pendentes (recorrentes com due_day e status pendente)
    pending = Expense.objects.filter(
        boleto_status='pending',
    ).select_related('category', 'bank', 'payment_type')

    alerts = []
    for exp in pending:
        if not exp.due_day:
            continue

        # Calcular data de vencimento no mês corrente da despesa
        exp_year = exp.date.year
        exp_month = exp.date.month
        max_day = calendar.monthrange(exp_year, exp_month)[1]
        due_date = date(exp_year, exp_month, min(exp.due_day, max_day))

        days_until = (due_date - today).days

        if days_until < 0:
            alert_level = 'overdue'
        elif days_until == 0:
            alert_level = 'due_today'
        elif days_until <= 3:
            alert_level = 'due_3_days'
        elif days_until <= 5:
            alert_level = 'due_5_days'
        else:
            continue  # Sem alerta ainda

        alerts.append({
            'id': str(exp.id),
            'description': exp.description,
            'amount': str(exp.amount),
            'date': exp.date.isoformat(),
            'due_date': due_date.isoformat(),
            'days_until': days_until,
            'alert_level': alert_level,
            'category_name': exp.category.name if exp.category else None,
            'bank_name': exp.bank.name if exp.bank else None,
        })

    # Ordenar por urgência (vencidos primeiro, depois por dias até vencimento)
    alerts.sort(key=lambda x: x['days_until'])

    return Response(alerts)
