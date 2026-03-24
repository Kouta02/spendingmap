"""
Management command para confirmar despesas recorrentes cujas datas já passaram.
Deve ser executado diariamente via cron.

Uso manual:
    python manage.py confirmar_recorrentes

Para cada grupo de despesas recorrentes (agrupadas por descrição),
encontra a cópia mais recente e gera a do próximo mês se necessário.
Boletos são criados como 'pending'. Não-boletos só são criados se a data já passou.
"""
import calendar
from datetime import date

from django.core.management.base import BaseCommand

from apps.expenses.models import Expense
from apps.financial_calendar.services import get_financial_month_for_date


class Command(BaseCommand):
    help = 'Confirma despesas recorrentes cujas datas já passaram.'

    def handle(self, *args, **options):
        today = date.today()
        created_count = 0

        # Buscar descrições únicas de despesas recorrentes
        descriptions = (
            Expense.objects
            .filter(is_recurring=True)
            .values_list('description', flat=True)
            .distinct()
        )

        for desc in descriptions:
            # Buscar a instância mais recente desta despesa recorrente
            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc)
                .select_related('category', 'bank', 'payment_type', 'credit_card')
                .order_by('-date')
                .first()
            )

            if not latest:
                continue

            # Calcular o próximo mês
            if latest.date.month == 12:
                next_month = 1
                next_year = latest.date.year + 1
            else:
                next_month = latest.date.month + 1
                next_year = latest.date.year

            # Verificar se já existe uma despesa para este mês
            already_exists = Expense.objects.filter(
                is_recurring=True,
                description=desc,
                date__year=next_year,
                date__month=next_month,
            ).exists()

            if already_exists:
                continue

            # Calcular a data do próximo mês
            max_day = calendar.monthrange(next_year, next_month)[1]
            day = min(latest.date.day, max_day)
            target_date = date(next_year, next_month, day)

            is_boleto = latest.payment_type and latest.payment_type.name.lower() == 'boleto'

            if is_boleto:
                # Boletos: criar pendente apenas para o mês atual ou o próximo
                max_allowed_month = today.month + 1 if today.month < 12 else 1
                max_allowed_year = today.year if today.month < 12 else today.year + 1
                target_limit = date(max_allowed_year, max_allowed_month, 28)
                if target_date > target_limit:
                    continue

                due_day = latest.due_day or latest.date.day
                fm = get_financial_month_for_date(target_date)

                Expense.objects.create(
                    description=latest.description,
                    amount=latest.amount,
                    date=target_date,
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
                created_count += 1
                self.stdout.write(
                    f'  Criada (boleto pendente): "{desc}" para {target_date.isoformat()}'
                )
            else:
                # Não-boleto: só criar se a data já passou
                if target_date > today:
                    continue

                fm = get_financial_month_for_date(target_date)

                Expense.objects.create(
                    description=latest.description,
                    amount=latest.amount,
                    date=target_date,
                    category=latest.category,
                    payment_type=latest.payment_type,
                    bank=latest.bank,
                    credit_card=latest.credit_card,
                    financial_month=fm,
                    is_recurring=True,
                    from_paycheck=latest.from_paycheck,
                    notes=latest.notes,
                )
                created_count += 1
                self.stdout.write(
                    f'  Criada: "{desc}" para {target_date.isoformat()}'
                )

        self.stdout.write(
            self.style.SUCCESS(f'Concluido! {created_count} despesas recorrentes confirmadas.')
        )
