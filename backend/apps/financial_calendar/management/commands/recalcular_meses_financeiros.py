"""
Management command para recalcular o campo financial_month de todas
as despesas de um ano, com base nas datas de pagamento cadastradas.

Uso:
    python manage.py recalcular_meses_financeiros --year=2026
    python manage.py recalcular_meses_financeiros  (recalcula o ano atual)
"""
from datetime import date

from django.core.management.base import BaseCommand

from apps.expenses.models import Expense
from apps.financial_calendar.services import (
    get_credit_card_financial_month,
    get_financial_month_for_date,
)


class Command(BaseCommand):
    help = 'Recalcula o mês financeiro de todas as despesas do ano especificado.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year',
            type=int,
            default=date.today().year,
            help='Ano para recalcular (padrão: ano atual)',
        )

    def handle(self, *args, **options):
        year = options['year']
        self.stdout.write(f'Recalculando meses financeiros para {year}...')

        expenses = Expense.objects.filter(
            date__year=year,
        ).select_related('credit_card', 'payment_type')

        updated = 0
        skipped = 0
        for exp in expenses:
            # Despesas do contracheque têm financial_month vinculado ao
            # snapshot salarial, não à data — não recalcular
            if exp.from_paycheck or (
                exp.payment_type
                and exp.payment_type.name == 'Descontado do Contracheque'
            ):
                skipped += 1
                continue

            if exp.credit_card:
                new_fm = get_credit_card_financial_month(exp.date, exp.credit_card)
            else:
                new_fm = get_financial_month_for_date(exp.date)

            if exp.financial_month != new_fm:
                exp.financial_month = new_fm
                exp.save(update_fields=['financial_month'])
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Concluído! {updated} despesas atualizadas '
                f'({skipped} descontos do contracheque ignorados).'
            )
        )
