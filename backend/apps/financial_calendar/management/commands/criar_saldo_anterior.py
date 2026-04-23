"""
Management command para criar a receita "Saldo anterior" no mês financeiro atual.
Deve ser executado diariamente via cron.

Na virada do mês financeiro, cria uma receita com o saldo que sobrou do mês anterior,
para que esse valor seja carregado como receita do mês atual.

É idempotente: se já existe uma receita com a categoria "Saldo anterior" no mês
financeiro atual, nada é feito.
"""
from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand
from django.db.models import Sum

from apps.expenses.models import Expense
from apps.financial_calendar.services import get_financial_month_for_date
from apps.incomes.models import Income, IncomeCategory
from apps.salary.models import SalarySnapshot


SALDO_ANTERIOR_CATEGORY_NAME = 'Saldo anterior'


def _calcular_saldo_mes(ref_date):
    """Calcula o saldo real de um mês: (bruto - descontos) + receitas - despesas."""
    snapshot = SalarySnapshot.objects.filter(month=ref_date).first()
    bruto = Decimal(str(snapshot.bruto_total)) if snapshot else Decimal('0')

    descontos = Decimal('0')
    despesas = Decimal('0')
    for exp in Expense.objects.filter(financial_month=ref_date).select_related('payment_type'):
        is_desconto = exp.from_paycheck or (
            exp.payment_type and exp.payment_type.name == 'Descontado do Contracheque'
        )
        if is_desconto:
            descontos += exp.amount
        else:
            despesas += exp.amount

    receitas = Income.objects.filter(
        financial_month=ref_date,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    return (bruto - descontos) + receitas - despesas


class Command(BaseCommand):
    help = 'Cria receita "Saldo anterior" no mês financeiro atual com o saldo do mês anterior.'

    def handle(self, *args, **options):
        today = date.today()
        current_fm = get_financial_month_for_date(today)
        prev_fm = current_fm - relativedelta(months=1)

        self.stdout.write(f'Mês financeiro atual: {current_fm}')
        self.stdout.write(f'Mês financeiro anterior: {prev_fm}')

        categoria, _ = IncomeCategory.objects.get_or_create(
            name=SALDO_ANTERIOR_CATEGORY_NAME,
            defaults={'icon': 'account_balance_wallet', 'color': '#607d8b'},
        )

        ja_existe = Income.objects.filter(
            financial_month=current_fm,
            category=categoria,
        ).exists()
        if ja_existe:
            self.stdout.write(
                f'Receita "Saldo anterior" já existe em {current_fm}. Ignorando.'
            )
            return

        tem_snapshot = SalarySnapshot.objects.filter(month=prev_fm).exists()
        tem_despesa = Expense.objects.filter(financial_month=prev_fm).exists()
        tem_receita = Income.objects.filter(financial_month=prev_fm).exists()
        if not (tem_snapshot or tem_despesa or tem_receita):
            self.stdout.write(
                f'Mês {prev_fm} não tem dados. Nada a fazer.'
            )
            return

        saldo = _calcular_saldo_mes(prev_fm)

        Income.objects.create(
            description=f'Saldo anterior ({prev_fm.strftime("%m/%Y")})',
            amount=saldo,
            date=today,
            category=categoria,
            financial_month=current_fm,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Receita "Saldo anterior" criada em {current_fm}: R$ {saldo:.2f}'
            )
        )
