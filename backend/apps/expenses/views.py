import calendar
import uuid
from datetime import date
from decimal import Decimal

from rest_framework import status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.financial_calendar.services import (
    get_financial_month_for_date,
    get_financial_month_range,
)

from .filters import ExpenseFilter
from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(ModelViewSet):
    queryset = Expense.objects.select_related(
        'category', 'third_party', 'payment_type', 'credit_card',
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

        # Gerar entradas virtuais para despesas recorrentes sem registro real
        virtual_entries = self._build_virtual_recurring(target_fm)
        response.data.extend(virtual_entries)

        # Gerar entradas virtuais para despesas do contracheque
        virtual_paycheck = self._build_virtual_paycheck(target_fm)
        response.data.extend(virtual_paycheck)

        # Reordenar por data desc
        response.data.sort(key=lambda x: x.get('date', ''), reverse=True)
        return response

    def _build_virtual_recurring(self, target_fm):
        """
        Para cada despesa recorrente que não tem registro real no mês alvo,
        gera uma entrada virtual (is_predicted=True). Nunca cria registros no banco.
        """
        virtual = []

        # Descrições únicas de recorrentes
        descriptions = (
            Expense.objects
            .filter(is_recurring=True)
            .values_list('description', flat=True)
            .distinct()
        )

        for desc in descriptions:
            # Já existe registro real para este mês financeiro?
            if Expense.objects.filter(
                is_recurring=True,
                description=desc,
                financial_month=target_fm,
            ).exists():
                continue

            # Buscar a instância mais recente
            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc)
                .select_related('category', 'third_party', 'payment_type', 'credit_card')
                .order_by('-financial_month')
                .first()
            )

            if not latest:
                continue

            # Só gerar para meses posteriores ao último registro
            latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)
            if target_fm <= latest_fm:
                continue

            # Calcular data dentro do período financeiro alvo
            start, end = get_financial_month_range(target_fm.year, target_fm.month)
            due_day = latest.due_day or latest.date.day
            max_day = calendar.monthrange(start.year, start.month)[1]
            target_date = date(start.year, start.month, min(due_day, max_day))
            if not (start <= target_date <= end):
                target_date = start

            is_boleto = latest.payment_type and latest.payment_type.name.lower() == 'boleto'

            virtual.append({
                'id': f'predicted-{latest.id}-{target_fm.year}-{target_fm.month}',
                'description': latest.description,
                'amount': str(latest.amount),
                'date': target_date.isoformat(),
                'category': str(latest.category_id) if latest.category_id else None,
                'category_name': latest.category.name if latest.category else None,
                'payment_type': str(latest.payment_type_id) if latest.payment_type_id else None,
                'payment_type_name': latest.payment_type.name if latest.payment_type else None,
                'third_party': str(latest.third_party_id) if latest.third_party_id else None,
                'third_party_name': latest.third_party.name if latest.third_party else None,
                'credit_card': str(latest.credit_card_id) if latest.credit_card_id else None,
                'credit_card_name': latest.credit_card.name if latest.credit_card else None,
                'financial_month': target_fm.isoformat(),
                'is_installment': False,
                'installment_current': None,
                'installment_total': None,
                'installment_group_id': None,
                'is_recurring': True,
                'from_paycheck': latest.from_paycheck,
                'due_day': latest.due_day,
                'boleto_status': 'pending' if is_boleto else None,
                'notes': latest.notes,
                'is_predicted': True,
                'created_at': None,
                'updated_at': None,
            })

        return virtual

    def _build_virtual_paycheck(self, target_fm):
        """
        Gera despesas virtuais do contracheque (PSS, IRPF, Funpresp) para meses
        que ainda não têm registros reais. Calcula via SalaryEngine + config salva.
        Exceção: abril/2026 nunca é gerado virtualmente.
        """
        from apps.salary.engine import SalaryEngine, SalaryInput
        from apps.salary.models import SalaryConfig, SalarySnapshot

        EXCEPTION_MONTH = date(2026, 4, 1)
        if target_fm == EXCEPTION_MONTH:
            return []

        # Se já existe snapshot real, não gerar virtuais
        if SalarySnapshot.objects.filter(month=target_fm).exists():
            return []

        # Só gerar para meses futuros (posteriores ao último snapshot)
        latest_snapshot = SalarySnapshot.objects.order_by('-month').first()
        if not latest_snapshot or target_fm <= latest_snapshot.month:
            return []

        config = SalaryConfig.objects.first()
        if not config:
            return []

        # Calcular contracheque
        inp = SalaryInput(
            padrao=config.padrao,
            year=target_fm.year,
            gdae_perc=config.gdae_perc / 100,
            has_aeq=config.has_aeq,
            aeq_perc=config.aeq_perc / 100 if config.has_aeq else Decimal('0'),
            vpi=config.vpi,
            has_funpresp=config.has_funpresp,
            funpresp_perc=config.funpresp_perc / 100,
            funcao_comissionada=config.funcao_comissionada or None,
            has_creche=config.has_creche,
            num_filhos=config.num_filhos,
            dependentes_ir=config.dependentes_ir,
            approved_years=config.get_approved_years(),
        )

        engine = SalaryEngine()
        result = engine.calculate(inp)

        # Buscar categorias e payment_type do mês mais recente
        prev_expenses = Expense.objects.filter(
            from_paycheck=True,
        ).select_related('category', 'payment_type').order_by('-financial_month')

        cat_map = {}
        pt_info = {'id': None, 'name': None}
        for exp in prev_expenses:
            if exp.description not in cat_map:
                cat_map[exp.description] = {
                    'id': str(exp.category_id) if exp.category_id else None,
                    'name': exp.category.name if exp.category else None,
                }
            if pt_info['id'] is None and exp.payment_type:
                pt_info = {
                    'id': str(exp.payment_type_id),
                    'name': exp.payment_type.name,
                }

        start, _end = get_financial_month_range(target_fm.year, target_fm.month)

        virtual = []
        descontos = []
        if result.pss > 0:
            descontos.append(('PSSS (Lei 12.618/12)', result.pss))
        if result.irpf > 0:
            descontos.append(('IRPF', result.irpf))
        if result.funpresp > 0:
            descontos.append(('Funpresp - Contrib. Básica', result.funpresp))

        for desc, amount in descontos:
            # Verificar se já existe registro real
            if Expense.objects.filter(
                description=desc, from_paycheck=True, financial_month=target_fm,
            ).exists():
                continue

            cat = cat_map.get(desc, {'id': None, 'name': None})
            virtual.append({
                'id': f'paycheck-{target_fm.year}-{target_fm.month}-{desc}',
                'description': desc,
                'amount': str(amount),
                'date': start.isoformat(),
                'category': cat['id'],
                'category_name': cat['name'],
                'payment_type': pt_info['id'],
                'payment_type_name': pt_info['name'],
                'third_party': None,
                'third_party_name': None,
                'credit_card': None,
                'credit_card_name': None,
                'financial_month': target_fm.isoformat(),
                'is_installment': False,
                'installment_current': None,
                'installment_total': None,
                'installment_group_id': None,
                'is_recurring': False,
                'from_paycheck': True,
                'due_day': None,
                'boleto_status': None,
                'notes': '',
                'is_predicted': True,
                'created_at': None,
                'updated_at': None,
            })

        return virtual

    @action(detail=True, methods=['delete'], url_path='delete-installments')
    def delete_installments(self, request, pk=None):
        """
        Exclui parcelas de um grupo a partir do mês financeiro informado.
        Query param: ?from_month=2026-04 (opcional, padrão: todas)
        """
        expense = self.get_object()
        if not expense.installment_group_id:
            return Response(
                {'detail': 'Esta despesa não faz parte de um grupo de parcelas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Expense.objects.filter(installment_group_id=expense.installment_group_id)

        from_month = request.query_params.get('from_month')
        if from_month:
            year, month = map(int, from_month.split('-'))
            ref_date = date(year, month, 1)
            qs = qs.filter(financial_month__gte=ref_date)

        count = qs.count()
        qs.delete()
        return Response({'deleted': count})

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

    # Boletos pendentes (recorrentes ou parcelados com due_day e status pendente)
    pending = Expense.objects.filter(
        boleto_status='pending',
    ).select_related('category', 'third_party', 'payment_type')

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
            'third_party_name': exp.third_party.name if exp.third_party else None,
        })

    # Ordenar por urgência (vencidos primeiro, depois por dias até vencimento)
    alerts.sort(key=lambda x: x['days_until'])

    return Response(alerts)
