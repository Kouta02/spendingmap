"""
Endpoints de agregação para o Dashboard.
Combina dados de despesas e salário numa visão mensal unificada.
"""
from datetime import date
from decimal import Decimal

from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.expenses.models import Expense
from apps.salary.models import SalarySnapshot
from apps.categories.models import Category
from apps.banks.models import Bank


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

    # Despesas do mês
    expenses_qs = Expense.objects.filter(
        date__year=ref_date.year,
        date__month=ref_date.month,
    )
    total_despesas = expenses_qs.aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    quantidade_despesas = expenses_qs.count()

    # Snapshot salarial do mês
    snapshot = SalarySnapshot.objects.filter(month=ref_date).first()
    liquido = Decimal(str(snapshot.liquido)) if snapshot else Decimal('0')
    bruto = Decimal(str(snapshot.bruto_total)) if snapshot else Decimal('0')
    total_descontos = Decimal('0')
    if snapshot:
        total_descontos = (
            Decimal(str(snapshot.pss))
            + Decimal(str(snapshot.irpf))
            + Decimal(str(snapshot.funpresp))
            + Decimal(str(snapshot.abate_teto))
        )

    saldo_livre = liquido - total_despesas

    return Response({
        'month': ref_date.isoformat(),
        'receita_liquida': str(liquido),
        'receita_bruta': str(bruto),
        'total_descontos_salario': str(total_descontos),
        'total_despesas': str(total_despesas),
        'quantidade_despesas': quantidade_despesas,
        'saldo_livre': str(saldo_livre),
        'has_snapshot': snapshot is not None,
    })


@api_view(['GET'])
def expenses_by_category(request):
    """
    Despesas agrupadas por categoria para o mês.
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
        Expense.objects.filter(
            date__year=ref_date.year,
            date__month=ref_date.month,
        )
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
    Despesas agrupadas por banco para o mês.
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
        Expense.objects.filter(
            date__year=ref_date.year,
            date__month=ref_date.month,
        )
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
    Evolução mensal dos últimos 12 meses: total de despesas e receita líquida.
    Query param: ?months=12 (padrão: 12)
    """
    months_count = int(request.query_params.get('months', 12))

    # Despesas agrupadas por mês
    expense_data = (
        Expense.objects
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('month')
    )

    # Snapshots salariais
    snapshot_data = SalarySnapshot.objects.all().order_by('month')

    # Montar mapa de meses
    expense_map = {
        item['month'].isoformat(): {
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
