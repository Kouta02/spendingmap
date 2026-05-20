"""
Management command para confirmar despesas recorrentes.
Deve ser executado diariamente via cron.

Uso manual:
    python manage.py confirmar_recorrentes

Para cada grupo de despesas recorrentes (agrupadas por descrição),
calcula a próxima ocorrência (mês financeiro alvo + data alvo) e
materializa o registro real quando apropriado:

- Cartão de crédito: cria o registro assim que `today >= target_date`
  (o "dia efetivo da compra"), antecipando o próximo FM. Permite
  catch-up: se o cron ficou parado, cria múltiplos meses na mesma
  rodada até alcançar o presente.

- Demais tipos (boleto, débito, pix, dinheiro): cria o registro
  quando o FM alvo == FM atual (comportamento original — a competência
  é o próprio FM, não há "data da compra" antecipando).
"""
from datetime import date

from django.core.management.base import BaseCommand

from apps.expenses.models import Expense
from apps.financial_calendar.services import (
    get_financial_month_for_date,
    get_recurring_next_date,
)


def _next_fm(fm):
    """Retorna o primeiro dia do mês financeiro seguinte."""
    if fm.month == 12:
        return date(fm.year + 1, 1, 1)
    return date(fm.year, fm.month + 1, 1)


class Command(BaseCommand):
    help = 'Confirma despesas recorrentes (cartão antecipa pelo dia da compra; demais pelo FM atual).'

    def handle(self, *args, **options):
        today = date.today()
        current_fm = get_financial_month_for_date(today)
        created_count = 0

        self.stdout.write(f'Hoje: {today} | Mês financeiro atual: {current_fm}')

        descriptions = (
            Expense.objects
            .filter(is_recurring=True)
            .order_by()
            .values_list('description', flat=True)
            .distinct()
        )

        for desc in descriptions:
            created_count += self._process_description(desc, today, current_fm)

        self.stdout.write(
            self.style.SUCCESS(f'Concluído! {created_count} despesas recorrentes criadas.')
        )

    def _process_description(self, desc, today, current_fm):
        """Loop interno: cria quantas ocorrências forem devidas para esta série."""
        created = 0

        while True:
            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc)
                .select_related('category', 'payment_type', 'credit_card')
                .order_by('-financial_month')
                .first()
            )
            if not latest:
                break

            latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)
            is_credit_card = latest.credit_card_id is not None

            # Cartão antecipa o próximo FM; demais ficam presos ao FM atual.
            if is_credit_card:
                target_fm = _next_fm(latest_fm)
            else:
                target_fm = current_fm

            if target_fm <= latest_fm:
                break

            if latest.recurrence_ends_at and target_fm >= latest.recurrence_ends_at:
                self.stdout.write(
                    f'  Pulada (encerrada): "{desc}" — recurrence_ends_at={latest.recurrence_ends_at}'
                )
                break

            # Já existe registro real para o FM alvo? (caso o cron rode 2x no mesmo dia, etc.)
            if Expense.objects.filter(
                is_recurring=True, description=desc, financial_month=target_fm,
            ).exists():
                break

            target_date = get_recurring_next_date(latest, target_fm)

            # Gate: cartão espera o dia efetivo; demais esperam o FM virar.
            if is_credit_card:
                if today < target_date:
                    break
            else:
                if target_fm != current_fm:
                    break

            is_boleto = latest.payment_type and latest.payment_type.name.lower() == 'boleto'

            Expense.objects.create(
                description=latest.description,
                amount=latest.amount,
                date=target_date,
                category=latest.category,
                payment_type=latest.payment_type,
                credit_card=latest.credit_card,
                financial_month=target_fm,
                is_recurring=True,
                from_paycheck=latest.from_paycheck,
                due_day=latest.due_day,
                boleto_status='pending' if is_boleto else None,
                notes=latest.notes,
            )
            created += 1
            status_label = 'boleto pendente' if is_boleto else 'despesa'
            self.stdout.write(
                f'  Criada ({status_label}): "{desc}" — date={target_date} fm={target_fm.isoformat()}'
            )

        return created
