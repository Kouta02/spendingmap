"""
Management command para gerar automaticamente o snapshot salarial e as despesas
do contracheque para o mês financeiro atual.

Deve ser executado diariamente via cron (junto com confirmar_recorrentes).

Lógica:
1. Determina o mês financeiro atual
2. Se já existe snapshot para esse mês, não faz nada
3. Se o mês é abril/2026 (exceção), não faz nada
4. Calcula o contracheque usando SalaryConfig + SalaryEngine
5. Cria o SalarySnapshot
6. Cria as despesas do contracheque (PSS, IRPF, Funpresp) com from_paycheck=True
"""
from dataclasses import asdict
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.expenses.models import Expense
from apps.financial_calendar.services import (
    get_financial_month_for_date,
    get_financial_month_range,
)
from apps.salary.engine import SalaryEngine, SalaryInput
from apps.salary.models import SalaryConfig, SalarySnapshot


# Exceção: abril/2026 foi o último mês com contracheque manual
EXCEPTION_MONTH = date(2026, 4, 1)


class Command(BaseCommand):
    help = 'Gera snapshot salarial e despesas do contracheque para o mês financeiro atual.'

    def handle(self, *args, **options):
        today = date.today()
        current_fm = get_financial_month_for_date(today)

        self.stdout.write(f'Mês financeiro atual: {current_fm}')

        # Exceção: abril/2026
        if current_fm == EXCEPTION_MONTH:
            self.stdout.write('Mês de abril/2026 é exceção. Ignorando.')
            return

        # Já existe snapshot para este mês?
        if SalarySnapshot.objects.filter(month=current_fm).exists():
            self.stdout.write('Snapshot já existe para este mês. Nada a fazer.')
            return

        # Buscar configuração salarial
        config = SalaryConfig.objects.first()
        if not config:
            self.stdout.write(self.style.WARNING('Nenhuma configuração salarial encontrada.'))
            return

        # Calcular contracheque
        inp = SalaryInput(
            padrao=config.padrao,
            year=current_fm.year,
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

        # Criar snapshot
        snapshot = SalarySnapshot.objects.create(
            month=current_fm,
            padrao=result.padrao,
            effective_year=result.effective_year,
            vb=result.vb,
            gal=result.gal,
            gr=result.gr,
            gdae=result.gdae,
            aeq=result.aeq,
            vpi=result.vpi,
            fc=result.fc,
            auxilio_alimentacao=result.auxilio_alimentacao,
            auxilio_creche=result.auxilio_creche,
            bruto_total=result.bruto_total,
            abate_teto=result.abate_teto,
            pss=result.pss,
            funpresp=result.funpresp,
            irpf=result.irpf,
            liquido=result.liquido,
        )
        self.stdout.write(f'  Snapshot criado: líquido = R$ {result.liquido}')

        # Criar despesas do contracheque
        # Buscar tipo de pagamento "Descontado do Contracheque"
        from apps.expenses.models import Expense
        payment_type = None
        try:
            from django.apps import apps
            PaymentType = apps.get_model('payment_types', 'PaymentType')
            payment_type = PaymentType.objects.filter(
                name='Descontado do Contracheque'
            ).first()
        except Exception:
            pass

        # Data dentro do período financeiro
        start, _end = get_financial_month_range(current_fm.year, current_fm.month)
        expense_date = start

        # Buscar categorias do mês anterior para manter consistência
        prev_expenses = Expense.objects.filter(
            from_paycheck=True,
            financial_month__lt=current_fm,
        ).order_by('-financial_month')

        # Montar mapa descrição -> categoria do mês mais recente
        cat_map = {}
        for exp in prev_expenses:
            if exp.description not in cat_map:
                cat_map[exp.description] = exp.category_id

        # Descontos a criar
        descontos = []
        if result.pss > 0:
            descontos.append(('PSSS (Lei 12.618/12)', result.pss))
        if result.irpf > 0:
            descontos.append(('IRPF', result.irpf))
        if result.funpresp > 0:
            descontos.append(('Funpresp - Contrib. Básica', result.funpresp))

        created_count = 0
        for desc, amount in descontos:
            # Verificar se já existe
            if Expense.objects.filter(
                description=desc,
                from_paycheck=True,
                financial_month=current_fm,
            ).exists():
                continue

            Expense.objects.create(
                description=desc,
                amount=amount,
                date=expense_date,
                category_id=cat_map.get(desc),
                payment_type=payment_type,
                financial_month=current_fm,
                from_paycheck=True,
                is_recurring=False,
            )
            created_count += 1
            self.stdout.write(f'  Despesa criada: {desc} = R$ {amount}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Concluído! Snapshot + {created_count} despesas criadas para {current_fm}.'
            )
        )
