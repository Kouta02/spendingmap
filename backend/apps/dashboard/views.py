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
from apps.salary.models import SalarySnapshot


@api_view(['GET'])
def monthly_summary(request):
    """
    Resumo do mês: receita líquida, total despesas, saldo livre.
    Query param: ?month=2026-03 (padrão: mês atual)
    """
    month_param = request.query_params.get('month')
    if month_param:
        year, m = month_param.split('-')
        ref_date = date(int(year), int(m), 1)
    else:
        today = date.today()
        ref_date = date(today.year, today.month, 1)

    # Despesas do mês financeiro
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

    # Snapshot salarial do mês
    snapshot = SalarySnapshot.objects.filter(month=ref_date).first()
    bruto = Decimal(str(snapshot.bruto_total)) if snapshot else Decimal('0')

    # Remuneração líquida = bruto - todos os descontos do contracheque
    remuneracao_liquida = bruto - descontos_contracheque
    saldo_livre = remuneracao_liquida - total_despesas

    return Response({
        'month': ref_date.isoformat(),
        'remuneracao_bruta': str(bruto),
        'remuneracao_liquida': str(remuneracao_liquida),
        'total_descontos_salario': str(descontos_contracheque),
        'quantidade_descontos': qtd_descontos,
        'total_despesas': str(total_despesas),
        'quantidade_despesas': qtd_despesas,
        'saldo_livre': str(saldo_livre),
        'has_snapshot': snapshot is not None,
    })


@api_view(['GET'])
def expenses_by_category(request):
    """
    Despesas agrupadas por categoria para o mês financeiro.
    Query param: ?month=2026-03
    """
    month_param = request.query_params.get('month')
    if month_param:
        year, m = month_param.split('-')
        ref_date = date(int(year), int(m), 1)
    else:
        today = date.today()
        ref_date = date(today.year, today.month, 1)

    data = (
        Expense.objects.filter(financial_month=ref_date)
        .values('category', 'category__name', 'category__color')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )

    result = []
    for item in data:
        result.append({
            'category_id': str(item['category']) if item['category'] else None,
            'category_name': item['category__name'] or 'Sem categoria',
            'category_color': item['category__color'] or '#bdbdbd',
            'total': str(item['total']),
            'count': item['count'],
        })

    return Response(result)


@api_view(['GET'])
def expenses_by_bank(request):
    """
    Despesas agrupadas por banco para o mês financeiro.
    Query param: ?month=2026-03
    """
    month_param = request.query_params.get('month')
    if month_param:
        year, m = month_param.split('-')
        ref_date = date(int(year), int(m), 1)
    else:
        today = date.today()
        ref_date = date(today.year, today.month, 1)

    data = (
        Expense.objects.filter(financial_month=ref_date)
        .values('bank', 'bank__name', 'bank__color')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )

    result = []
    for item in data:
        result.append({
            'bank_id': str(item['bank']) if item['bank'] else None,
            'bank_name': item['bank__name'] or 'Sem banco',
            'bank_color': item['bank__color'] or '#bdbdbd',
            'total': str(item['total']),
            'count': item['count'],
        })

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
