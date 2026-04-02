"""
Endpoints de agregação para o Dashboard.
Combina dados de despesas e salário numa visão mensal unificada.
Usa o campo financial_month para agrupar por mês financeiro.
"""
from datetime import date
from decimal import Decimal

from django.db.models import Count, Sum
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.expenses.models import Expense
from apps.financial_calendar.services import get_financial_month_for_date
from apps.incomes.models import Income
from apps.salary.models import SalaryConfig, SalarySnapshot


# Exceção: abril/2026 (último contracheque manual)
EXCEPTION_MONTH = date(2026, 4, 1)


def _calculate_salary_from_config(year):
    """Calcula contracheque a partir da config salva, retorna SalaryResult ou None."""
    from apps.salary.engine import SalaryEngine, SalaryInput

    config = SalaryConfig.objects.first()
    if not config:
        return None

    inp = SalaryInput(
        padrao=config.padrao,
        year=year,
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
    return engine.calculate(inp)


def _get_paycheck_deductions_from_result(result):
    """Retorna lista de (descrição, valor) dos descontos do contracheque."""
    descontos = []
    if result.pss > 0:
        descontos.append(('PSSS (Lei 12.618/12)', result.pss))
    if result.irpf > 0:
        descontos.append(('IRPF', result.irpf))
    if result.funpresp > 0:
        descontos.append(('Funpresp - Contrib. Básica', result.funpresp))
    return descontos


def _get_virtual_recurring_totals(target_fm):
    """
    Calcula totais de despesas recorrentes virtuais para um mês futuro.
    Retorna (total_despesas, qtd_despesas, total_descontos, qtd_descontos).
    Separa despesas normais de descontos do contracheque.
    """
    total_despesas = Decimal('0')
    qtd_despesas = 0
    total_descontos = Decimal('0')
    qtd_descontos = 0

    descriptions = (
        Expense.objects
        .filter(is_recurring=True)
        .values_list('description', flat=True)
        .distinct()
    )

    for desc in descriptions:
        if Expense.objects.filter(
            is_recurring=True, description=desc, financial_month=target_fm,
        ).exists():
            continue

        latest = (
            Expense.objects
            .filter(is_recurring=True, description=desc)
            .select_related('payment_type')
            .order_by('-financial_month')
            .first()
        )
        if not latest:
            continue

        latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)
        if target_fm <= latest_fm:
            continue

        if latest.from_paycheck:
            continue

        is_desconto = (
            latest.payment_type
            and latest.payment_type.name == 'Descontado do Contracheque'
        )
        if is_desconto:
            total_descontos += latest.amount
            qtd_descontos += 1
        else:
            total_despesas += latest.amount
            qtd_despesas += 1

    return total_despesas, qtd_despesas, total_descontos, qtd_descontos


@api_view(['GET'])
def monthly_summary(request):
    """
    Resumo do mês: receita líquida, total despesas, saldo livre.
    Query param: ?month=2026-03 (padrão: mês atual)
    Para meses futuros sem snapshot, calcula via config salva + despesas virtuais.
    Saldo acumulado encadeado para meses futuros.
    """
    month_param = request.query_params.get('month')
    if month_param:
        year, m = month_param.split('-')
        ref_date = date(int(year), int(m), 1)
    else:
        ref_date = get_financial_month_for_date(date.today())

    current_fm = get_financial_month_for_date(date.today())
    is_future = ref_date > current_fm

    # Despesas reais do mês financeiro
    expenses_qs = Expense.objects.filter(
        financial_month=ref_date,
    ).select_related('payment_type')

    # Separar despesas descontadas do contracheque das demais
    descontos_contracheque = Decimal('0')
    qtd_descontos = 0
    total_despesas = Decimal('0')
    qtd_despesas = 0

    for exp in expenses_qs:
        if exp.from_paycheck or (
            exp.payment_type and exp.payment_type.name == 'Descontado do Contracheque'
        ):
            descontos_contracheque += exp.amount
            qtd_descontos += 1
        else:
            total_despesas += exp.amount
            qtd_despesas += 1

    # Receitas do mês financeiro
    incomes_qs = Income.objects.filter(financial_month=ref_date)
    total_outras_receitas = Decimal('0')
    qtd_receitas = 0
    for inc in incomes_qs:
        total_outras_receitas += inc.amount
        qtd_receitas += 1

    # Snapshot salarial do mês
    snapshot = SalarySnapshot.objects.filter(month=ref_date).first()

    if snapshot:
        # Mês com snapshot real
        bruto = Decimal(str(snapshot.bruto_total))
        remuneracao_liquida = bruto - descontos_contracheque
        saldo_livre = remuneracao_liquida + total_outras_receitas - total_despesas
    elif is_future and ref_date != EXCEPTION_MONTH:
        # Mês futuro sem snapshot: calcular via config
        result = _calculate_salary_from_config(ref_date.year)
        if result:
            bruto = Decimal(str(result.bruto_total))

            # Descontos do contracheque previstos (PSS, IRPF, Funpresp)
            descontos_previstos = _get_paycheck_deductions_from_result(result)
            descontos_engine = sum(
                Decimal(str(v)) for _, v in descontos_previstos
            )
            qtd_descontos_engine = len(descontos_previstos)

            # Despesas recorrentes virtuais separadas
            virtual_desp, virtual_qtd_desp, virtual_desc, virtual_qtd_desc = (
                _get_virtual_recurring_totals(ref_date)
            )

            # Somar descontos: engine + reais já cadastrados + virtuais recorrentes
            descontos_contracheque += descontos_engine + virtual_desc
            qtd_descontos += qtd_descontos_engine + virtual_qtd_desc

            # Somar despesas: reais já cadastradas + virtuais recorrentes
            total_despesas += virtual_desp
            qtd_despesas += virtual_qtd_desp

            remuneracao_liquida = bruto - descontos_contracheque
            saldo_proprio = remuneracao_liquida + total_outras_receitas - total_despesas

            # Saldo acumulado encadeado: somar saldo do mês anterior
            saldo_anterior = _get_accumulated_balance(ref_date, current_fm)
            saldo_livre = saldo_proprio + saldo_anterior
        else:
            bruto = Decimal('0')
            remuneracao_liquida = Decimal('0')
            saldo_livre = Decimal('0')
    else:
        # Mês sem snapshot e não futuro (passado sem dados)
        bruto = Decimal('0')
        remuneracao_liquida = bruto - descontos_contracheque
        saldo_livre = remuneracao_liquida + total_outras_receitas - total_despesas

    return Response({
        'month': ref_date.isoformat(),
        'remuneracao_bruta': str(bruto),
        'remuneracao_liquida': str(remuneracao_liquida),
        'total_descontos_salario': str(descontos_contracheque),
        'quantidade_descontos': qtd_descontos,
        'total_despesas': str(total_despesas),
        'quantidade_despesas': qtd_despesas,
        'total_outras_receitas': str(total_outras_receitas),
        'quantidade_receitas': qtd_receitas,
        'saldo_livre': str(saldo_livre),
        'has_snapshot': snapshot is not None,
        'is_predicted': is_future and snapshot is None,
    })


@api_view(['GET'])
def expense_details(request):
    """
    Retorna listas detalhadas de descontos do contracheque e despesas do mês.
    Para meses futuros sem dados reais, retorna previsões.
    Query param: ?month=2026-05
    """
    import calendar
    from apps.financial_calendar.services import get_financial_month_range

    month_param = request.query_params.get('month')
    if month_param:
        year, m = month_param.split('-')
        ref_date = date(int(year), int(m), 1)
    else:
        ref_date = get_financial_month_for_date(date.today())

    current_fm = get_financial_month_for_date(date.today())
    is_future = ref_date > current_fm
    has_snapshot = SalarySnapshot.objects.filter(month=ref_date).exists()

    # --- Descontos do contracheque ---
    descontos = []

    if is_future and not has_snapshot and ref_date != EXCEPTION_MONTH:
        # Calcular via config
        result = _calculate_salary_from_config(ref_date.year)
        if result:
            for desc, amount in _get_paycheck_deductions_from_result(result):
                descontos.append({'description': desc, 'amount': str(amount)})

        # Despesas reais com payment_type "Descontado do Contracheque" que são recorrentes
        recur_descontos = (
            Expense.objects
            .filter(is_recurring=True)
            .select_related('payment_type')
            .order_by('-financial_month')
        )
        seen = set()
        for exp in recur_descontos:
            is_desconto = exp.payment_type and exp.payment_type.name == 'Descontado do Contracheque'
            if is_desconto and not exp.from_paycheck and exp.description not in seen:
                # Verificar se tem registro real no mês alvo
                if not Expense.objects.filter(
                    is_recurring=True, description=exp.description, financial_month=ref_date,
                ).exists():
                    latest_fm = exp.financial_month or get_financial_month_for_date(exp.date)
                    if ref_date > latest_fm:
                        descontos.append({
                            'description': exp.description,
                            'amount': str(exp.amount),
                        })
                        seen.add(exp.description)
    else:
        # Dados reais
        for exp in Expense.objects.filter(financial_month=ref_date).select_related('payment_type'):
            if exp.from_paycheck or (
                exp.payment_type and exp.payment_type.name == 'Descontado do Contracheque'
            ):
                descontos.append({
                    'description': exp.description,
                    'amount': str(exp.amount),
                })

    # --- Despesas (não contracheque) ---
    despesas = []

    if is_future and not has_snapshot:
        # Despesas recorrentes virtuais
        descriptions = (
            Expense.objects
            .filter(is_recurring=True)
            .values_list('description', flat=True)
            .distinct()
        )
        for desc in descriptions:
            if Expense.objects.filter(
                is_recurring=True, description=desc, financial_month=ref_date,
            ).exists():
                continue

            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc)
                .select_related('payment_type')
                .order_by('-financial_month')
                .first()
            )
            if not latest:
                continue
            latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)
            if ref_date <= latest_fm:
                continue
            if latest.from_paycheck:
                continue
            # Pular descontos do contracheque (já estão na lista de descontos)
            if latest.payment_type and latest.payment_type.name == 'Descontado do Contracheque':
                continue

            despesas.append({
                'description': latest.description,
                'amount': str(latest.amount),
            })
    else:
        # Dados reais
        for exp in Expense.objects.filter(financial_month=ref_date).select_related('payment_type'):
            if not exp.from_paycheck and not (
                exp.payment_type and exp.payment_type.name == 'Descontado do Contracheque'
            ):
                despesas.append({
                    'description': exp.description,
                    'amount': str(exp.amount),
                })

    return Response({
        'descontos': descontos,
        'despesas': despesas,
    })


def _get_accumulated_balance(target_fm, current_fm):
    """
    Calcula o saldo acumulado até o mês anterior ao target_fm.
    Encadeia: mês atual (real) → meses futuros (previstos).
    """
    from dateutil.relativedelta import relativedelta

    prev_fm = target_fm - relativedelta(months=1)

    if prev_fm <= current_fm:
        # Mês anterior é o atual ou passado: pegar saldo real
        return _get_real_balance(prev_fm)
    else:
        # Mês anterior é futuro: calcular recursivamente
        saldo_proprio = _get_predicted_balance(prev_fm)
        saldo_anterior = _get_accumulated_balance(prev_fm, current_fm)
        return saldo_proprio + saldo_anterior


def _get_real_balance(ref_date):
    """Calcula o saldo real de um mês (com dados do banco)."""
    snapshot = SalarySnapshot.objects.filter(month=ref_date).first()
    bruto = Decimal(str(snapshot.bruto_total)) if snapshot else Decimal('0')

    expenses_qs = Expense.objects.filter(
        financial_month=ref_date,
    ).select_related('payment_type')

    descontos = Decimal('0')
    despesas = Decimal('0')
    for exp in expenses_qs:
        if exp.from_paycheck or (
            exp.payment_type and exp.payment_type.name == 'Descontado do Contracheque'
        ):
            descontos += exp.amount
        else:
            despesas += exp.amount

    receitas = Income.objects.filter(
        financial_month=ref_date,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    return (bruto - descontos) + receitas - despesas


def _get_predicted_balance(ref_date):
    """Calcula o saldo previsto de um mês futuro (sem snapshot)."""
    result = _calculate_salary_from_config(ref_date.year)
    if not result:
        return Decimal('0')

    bruto = Decimal(str(result.bruto_total))
    descontos_engine = sum(
        Decimal(str(v)) for _, v in _get_paycheck_deductions_from_result(result)
    )
    virtual_desp, _, virtual_desc, _ = _get_virtual_recurring_totals(ref_date)

    # Despesas reais já cadastradas no mês (parceladas, etc.)
    expenses_qs = Expense.objects.filter(
        financial_month=ref_date,
    ).select_related('payment_type')

    real_descontos = Decimal('0')
    real_despesas = Decimal('0')
    for exp in expenses_qs:
        if exp.from_paycheck or (
            exp.payment_type and exp.payment_type.name == 'Descontado do Contracheque'
        ):
            real_descontos += exp.amount
        else:
            real_despesas += exp.amount

    total_descontos = descontos_engine + virtual_desc + real_descontos
    total_despesas = virtual_desp + real_despesas

    receitas = Income.objects.filter(
        financial_month=ref_date,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    return (bruto - total_descontos) + receitas - total_despesas


@api_view(['GET'])
def expenses_by_category(request):
    """
    Despesas agrupadas por categoria para o mês financeiro.
    Para meses futuros, inclui despesas recorrentes virtuais.
    Query param: ?month=2026-03
    """
    month_param = request.query_params.get('month')
    if month_param:
        year, m = month_param.split('-')
        ref_date = date(int(year), int(m), 1)
    else:
        ref_date = get_financial_month_for_date(date.today())

    current_fm = get_financial_month_for_date(date.today())
    is_future = ref_date > current_fm

    # Despesas reais do mês agrupadas por categoria
    totals_map = {}  # {category_id: {name, color, total, count}}

    data = (
        Expense.objects.filter(financial_month=ref_date)
        .values('category', 'category__name', 'category__color')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    for item in data:
        cat_id = str(item['category']) if item['category'] else 'none'
        totals_map[cat_id] = {
            'name': item['category__name'] or 'Sem categoria',
            'color': item['category__color'] or '#bdbdbd',
            'total': item['total'],
            'count': item['count'],
        }

    # Para meses futuros, incluir recorrentes virtuais e descontos do contracheque
    if is_future:
        has_snapshot = SalarySnapshot.objects.filter(month=ref_date).exists()

        # Despesas recorrentes virtuais
        descriptions = (
            Expense.objects
            .filter(is_recurring=True)
            .values_list('description', flat=True)
            .distinct()
        )
        for desc in descriptions:
            if Expense.objects.filter(
                is_recurring=True, description=desc, financial_month=ref_date,
            ).exists():
                continue

            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc)
                .select_related('category', 'payment_type')
                .order_by('-financial_month')
                .first()
            )
            if not latest:
                continue

            latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)
            if ref_date <= latest_fm:
                continue
            if latest.from_paycheck:
                continue

            cat_id = str(latest.category_id) if latest.category_id else 'none'
            if cat_id in totals_map:
                totals_map[cat_id]['total'] += latest.amount
                totals_map[cat_id]['count'] += 1
            else:
                totals_map[cat_id] = {
                    'name': latest.category.name if latest.category else 'Sem categoria',
                    'color': latest.category.color if latest.category else '#bdbdbd',
                    'total': latest.amount,
                    'count': 1,
                }

        # Descontos do contracheque calculados pelo SalaryEngine (PSS, IRPF, Funpresp)
        if not has_snapshot and ref_date != EXCEPTION_MONTH:
            result_salary = _calculate_salary_from_config(ref_date.year)
            if result_salary:
                descontos = _get_paycheck_deductions_from_result(result_salary)

                # Buscar categorias dos registros reais mais recentes (from_paycheck)
                cat_map = {}
                prev_paycheck = (
                    Expense.objects
                    .filter(from_paycheck=True)
                    .select_related('category')
                    .order_by('-financial_month')
                )
                for exp in prev_paycheck:
                    if exp.description not in cat_map and exp.category_id:
                        cat_map[exp.description] = {
                            'id': str(exp.category_id),
                            'name': exp.category.name,
                            'color': exp.category.color or '#bdbdbd',
                        }

                for desc, amount in descontos:
                    cat_info = cat_map.get(desc)
                    cat_id = cat_info['id'] if cat_info else 'none'
                    amt = Decimal(str(amount))

                    if cat_id in totals_map:
                        totals_map[cat_id]['total'] += amt
                        totals_map[cat_id]['count'] += 1
                    else:
                        totals_map[cat_id] = {
                            'name': cat_info['name'] if cat_info else 'Sem categoria',
                            'color': cat_info['color'] if cat_info else '#bdbdbd',
                            'total': amt,
                            'count': 1,
                        }

    result = sorted(
        [
            {
                'category_id': cat_id if cat_id != 'none' else None,
                'category_name': info['name'],
                'category_color': info['color'],
                'total': str(info['total']),
                'count': info['count'],
            }
            for cat_id, info in totals_map.items()
        ],
        key=lambda x: Decimal(x['total']),
        reverse=True,
    )

    return Response(result)


@api_view(['GET'])
def expenses_by_credit_card(request):
    """
    Despesas agrupadas por cartão de crédito para o mês financeiro.
    Para meses futuros, inclui despesas recorrentes virtuais com cartão.
    Query param: ?month=2026-03
    """
    month_param = request.query_params.get('month')
    if month_param:
        year, m = month_param.split('-')
        ref_date = date(int(year), int(m), 1)
    else:
        ref_date = get_financial_month_for_date(date.today())

    current_fm = get_financial_month_for_date(date.today())
    is_future = ref_date > current_fm

    # Despesas reais do mês agrupadas por cartão
    totals_map = {}  # {credit_card_id: {name, total, count}}

    data = (
        Expense.objects.filter(financial_month=ref_date, credit_card__isnull=False)
        .values('credit_card', 'credit_card__name')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    for item in data:
        cc_id = str(item['credit_card'])
        totals_map[cc_id] = {
            'name': item['credit_card__name'] or 'Sem cartão',
            'total': item['total'],
            'count': item['count'],
        }

    # Para meses futuros, incluir recorrentes virtuais com cartão
    if is_future:
        descriptions = (
            Expense.objects
            .filter(is_recurring=True, credit_card__isnull=False)
            .values_list('description', flat=True)
            .distinct()
        )
        for desc in descriptions:
            if Expense.objects.filter(
                is_recurring=True, description=desc, financial_month=ref_date,
            ).exists():
                continue

            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc, credit_card__isnull=False)
                .select_related('credit_card', 'payment_type')
                .order_by('-financial_month')
                .first()
            )
            if not latest or not latest.credit_card:
                continue

            latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)
            if ref_date <= latest_fm:
                continue
            if latest.from_paycheck:
                continue

            cc_id = str(latest.credit_card_id)
            if cc_id in totals_map:
                totals_map[cc_id]['total'] += latest.amount
                totals_map[cc_id]['count'] += 1
            else:
                totals_map[cc_id] = {
                    'name': latest.credit_card.name,
                    'total': latest.amount,
                    'count': 1,
                }

    # Subtrair devoluções de cartão (receitas vinculadas a cartão de crédito)
    refunds = (
        Income.objects.filter(financial_month=ref_date, credit_card__isnull=False)
        .values('credit_card')
        .annotate(total=Sum('amount'))
    )
    for item in refunds:
        cc_id = str(item['credit_card'])
        if cc_id in totals_map:
            totals_map[cc_id]['total'] -= item['total']

    result = sorted(
        [
            {
                'credit_card_id': cc_id,
                'credit_card_name': info['name'],
                'total': str(info['total']),
                'count': info['count'],
            }
            for cc_id, info in totals_map.items()
        ],
        key=lambda x: Decimal(x['total']),
        reverse=True,
    )

    return Response(result)


@api_view(['GET'])
def expenses_by_third_party(request):
    """
    Despesas agrupadas por terceiro para o mês financeiro.
    Para meses futuros, inclui despesas recorrentes virtuais.
    Query param: ?month=2026-03
    """
    month_param = request.query_params.get('month')
    if month_param:
        year, m = month_param.split('-')
        ref_date = date(int(year), int(m), 1)
    else:
        ref_date = get_financial_month_for_date(date.today())

    current_fm = get_financial_month_for_date(date.today())
    is_future = ref_date > current_fm

    # Despesas reais do mês agrupadas por terceiro
    totals_map = {}  # {third_party_id: {name, total, count}}

    data = (
        Expense.objects.filter(financial_month=ref_date, third_party__isnull=False)
        .values('third_party', 'third_party__name')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    for item in data:
        tp_id = str(item['third_party'])
        totals_map[tp_id] = {
            'name': item['third_party__name'] or 'Sem terceiro',
            'total': item['total'],
            'count': item['count'],
        }

    # Para meses futuros, incluir recorrentes virtuais
    if is_future:
        descriptions = (
            Expense.objects
            .filter(is_recurring=True, third_party__isnull=False)
            .values_list('description', flat=True)
            .distinct()
        )
        for desc in descriptions:
            if Expense.objects.filter(
                is_recurring=True, description=desc, financial_month=ref_date,
            ).exists():
                continue

            latest = (
                Expense.objects
                .filter(is_recurring=True, description=desc, third_party__isnull=False)
                .select_related('third_party', 'payment_type')
                .order_by('-financial_month')
                .first()
            )
            if not latest or not latest.third_party:
                continue

            latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)
            if ref_date <= latest_fm:
                continue
            if latest.from_paycheck:
                continue

            tp_id = str(latest.third_party_id)
            if tp_id in totals_map:
                totals_map[tp_id]['total'] += latest.amount
                totals_map[tp_id]['count'] += 1
            else:
                totals_map[tp_id] = {
                    'name': latest.third_party.name,
                    'total': latest.amount,
                    'count': 1,
                }

    result = sorted(
        [
            {
                'third_party_id': tp_id,
                'third_party_name': info['name'],
                'total': str(info['total']),
                'count': info['count'],
            }
            for tp_id, info in totals_map.items()
        ],
        key=lambda x: Decimal(x['total']),
        reverse=True,
    )

    return Response(result)


@api_view(['GET'])
def monthly_evolution(request):
    """
    Evolução mensal: total de despesas e receita líquida.
    Agrupa por financial_month.
    Query param: ?months=12 (padrão: 12)
    """
    months_count = int(request.query_params.get('months', 12))

    # Despesas agrupadas por mês financeiro
    expense_data = (
        Expense.objects
        .exclude(financial_month__isnull=True)
        .values('financial_month')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('financial_month')
    )

    # Snapshots salariais
    snapshot_data = SalarySnapshot.objects.all().order_by('month')

    # Montar mapa de meses
    expense_map = {
        item['financial_month'].isoformat(): {
            'despesas': str(item['total']),
            'quantidade': item['count'],
        }
        for item in expense_data
    }
    snapshot_map = {
        s.month.isoformat(): str(s.liquido)
        for s in snapshot_data
    }

    # Combinar todos os meses encontrados
    all_months = sorted(set(list(expense_map.keys()) + list(snapshot_map.keys())))
    if months_count and len(all_months) > months_count:
        all_months = all_months[-months_count:]

    result = []
    for m in all_months:
        exp = expense_map.get(m, {'despesas': '0', 'quantidade': 0})
        result.append({
            'month': m,
            'despesas': exp['despesas'],
            'quantidade': exp['quantidade'],
            'receita_liquida': snapshot_map.get(m, '0'),
        })

    return Response(result)
