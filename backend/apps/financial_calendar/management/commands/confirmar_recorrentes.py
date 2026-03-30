"""
Management command para confirmar despesas recorrentes do mês financeiro atual.
Deve ser executado diariamente via cron.

Uso manual:
    python manage.py confirmar_recorrentes

Para cada grupo de despesas recorrentes (agrupadas por descrição),
verifica se já existe registro para o mês financeiro atual.
Se não existir, cria um novo registro a partir do template mais recente.
Boletos são criados como 'pending'. Não-boletos são criados normalmente.
"""
import calendar
from datetime import date

from django.core.management.base import BaseCommand

from apps.expenses.models import Expense
from apps.financial_calendar.services import (
    get_financial_month_for_date,
    get_financial_month_range,
)


class Command(BaseCommand):
    help = 'Confirma despesas recorrentes para o mês financeiro atual.'

    def handle(self, *args, **options):
        today = date.today()
        current_fm = get_financial_month_for_date(today)
        created_count = 0

        self.stdout.write(f'Mês financeiro atual: {current_fm}')

        # Buscar descrições únicas de despesas recorrentes
        descriptions = (
            Expense.objects
            .filter(is_recurring=True)
            .values_list('description', flat=True)
            .distinct()
        )

        for desc in descriptions:
            # Já existe registro para o mês financeiro atual?
            already_exists = Expense.objects.filter(
                is_recurring=True,
                description=desc,
                financial_month=current_fm,
            ).exists()

            if already_exists:
                continue

            # Buscar a instância mais recente desta recorrente
            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc)
                .select_related('category', 'bank', 'payment_type', 'credit_card')
                .order_by('-financial_month')
                .first()
            )

            if not latest:
                continue

            # Só gerar se o mês atual é posterior ao último registro
            latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)
            if current_fm <= latest_fm:
                continue

            # Calcular data dentro do período financeiro atual
            start, end = get_financial_month_range(current_fm.year, current_fm.month)
            due_day = latest.due_day or latest.date.day
            max_day = calendar.monthrange(start.year, start.month)[1]
            target_date = date(start.year, start.month, min(due_day, max_day))
            if not (start <= target_date <= end):
                target_date = start

            is_boleto = latest.payment_type and latest.payment_type.name.lower() == 'boleto'

            Expense.objects.create(
                description=latest.description,
                amount=latest.amount,
                date=target_date,
                category=latest.category,
                payment_type=latest.payment_type,
                bank=latest.bank,
                credit_card=latest.credit_card,
                financial_month=current_fm,
                is_recurring=True,
                from_paycheck=latest.from_paycheck,
                due_day=latest.due_day,
                boleto_status='pending' if is_boleto else None,
                notes=latest.notes,
            )
            created_count += 1
            status_label = 'boleto pendente' if is_boleto else 'despesa'
            self.stdout.write(
                f'  Criada ({status_label}): "{desc}" para {current_fm.isoformat()}'
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Concluído! {created_count} despesas recorrentes criadas para {current_fm}.'
            )
        )
