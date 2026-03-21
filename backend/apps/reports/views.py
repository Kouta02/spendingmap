"""
Endpoints de relatórios — agregações por período, categoria e parcelas futuras.
"""
from datetime import date
from decimal import Decimal

from django.db.models import Sum, Count, Q, F
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.expenses.models import Expense
from apps.salary.models import SalarySnapshot


@api_view(['GET'])
def summary_by_period(request):
    """
    Resumo de despesas por período.
    Query params: ?start=2026-01-01&end=2026-06-30
    """
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    if not start or not end:
        today = date.today()
        start = date(today.year, today.month, 1).isoformat()
        end = today.isoformat()

    qs = Expense.objects.filter(date__gte=start, date__lte=end)

    total = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    count = qs.count()

    # Separar despesas do contracheque
    from_paycheck = qs.filter(from_paycheck=True).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    external = total - from_paycheck

    # Por tipo de pagamento
    by_payment = list(
        qs.values('payment_type')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    for item in by_payment:
        item['total'] = str(item['total'])

    return Response({
        'period': {'start': start, 'end': end},
        'total': str(total),
        'total_externo': str(external),
        'total_contracheque': str(from_paycheck),
        'count': count,
        'by_payment_type': by_payment,
    })


@api_view(['GET'])
def by_category_period(request):
    """
    Despesas por categoria em um período.
    Query params: ?start=2026-01-01&end=2026-06-30
    """
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    if not start or not end:
        today = date.today()
        start = date(today.year, today.month, 1).isoformat()
        end = today.isoformat()

    data = (
        Expense.objects.filter(date__gte=start, date__lte=end)
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

    total_geral = sum(Decimal(r['total']) for r in result)
    for r in result:
        r['percentage'] = round(float(Decimal(r['total']) / total_geral * 100), 1) if total_geral else 0

    return Response({
        'period': {'start': start, 'end': end},
        'total': str(total_geral),
        'data': result,
    })


@api_view(['GET'])
def installments_projection(request):
    """
    Projeção de parcelas futuras a partir do mês atual.
    Retorna parcelas agrupadas por installment_group_id com parcelas restantes.
    """
    today = date.today()
    ref = date(today.year, today.month, 1)

    # Buscar parcelas futuras (data >= mês atual)
    qs = (
        Expense.objects.filter(
            is_installment=True,
            date__gte=ref,
        )
        .select_related('category', 'bank')
        .order_by('installment_group_id', 'date')
    )

    # Agrupar por installment_group_id
    groups: dict = {}
    for exp in qs:
        gid = str(exp.installment_group_id)
        if gid not in groups:
            groups[gid] = {
                'installment_group_id': gid,
                'description': exp.description,
                'amount_per_installment': str(exp.amount),
                'category_name': exp.category.name if exp.category else None,
                'bank_name': exp.bank.name if exp.bank else None,
                'installment_total': exp.installment_total,
                'remaining': 0,
                'total_remaining': Decimal('0'),
                'installments': [],
            }
        groups[gid]['remaining'] += 1
        groups[gid]['total_remaining'] += exp.amount
        groups[gid]['installments'].append({
            'date': exp.date.isoformat(),
            'installment_current': exp.installment_current,
            'amount': str(exp.amount),
        })

    for g in groups.values():
        g['total_remaining'] = str(g['total_remaining'])

    result = sorted(groups.values(), key=lambda x: x['installments'][0]['date'])
    total = sum(Decimal(g['total_remaining']) for g in result)

    return Response({
        'from_month': ref.isoformat(),
        'total_remaining': str(total),
        'groups_count': len(result),
        'data': result,
    })


@api_view(['GET'])
def monthly_comparison(request):
    """
    Comparativo mensal: últimos N meses lado a lado.
    Query param: ?months=6 (padrão: 6)
    """
    months_count = int(request.query_params.get('months', 6))
    today = date.today()

    result = []
    for i in range(months_count - 1, -1, -1):
        # Calcular mês
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        ref = date(y, m, 1)

        # Despesas do mês
        qs = Expense.objects.filter(date__year=ref.year, date__month=ref.month)
        total_despesas = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        count = qs.count()

        # Snapshot salarial
        snapshot = SalarySnapshot.objects.filter(month=ref).first()
        liquido = Decimal(str(snapshot.liquido)) if snapshot else Decimal('0')
        saldo = liquido - total_despesas

        result.append({
            'month': ref.isoformat(),
            'month_label': ref.strftime('%m/%Y'),
            'receita_liquida': str(liquido),
            'total_despesas': str(total_despesas),
            'quantidade_despesas': count,
            'saldo': str(saldo),
        })

    return Response(result)
