"""
Endpoints de relatórios — agregações por período, categoria e parcelas futuras.
"""
from datetime import date
from decimal import Decimal

from django.db.models import Sum, Count, Q as models_Q, F
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.expenses.models import Expense
from apps.financial_calendar.services import (
    get_financial_month_for_date,
    get_financial_month_range,
)
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
        fm = get_financial_month_for_date(date.today())
        fm_start, fm_end = get_financial_month_range(fm.year, fm.month)
        start = fm_start.isoformat()
        end = fm_end.isoformat()

    qs = Expense.objects.filter(date__gte=start, date__lte=end).select_related('payment_type')

    total = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    count = qs.count()

    # Separar despesas do contracheque (from_paycheck ou tipo "Descontado do Contracheque")
    from_paycheck_total = Decimal('0')
    for exp in qs.filter(
        models_Q(from_paycheck=True) | models_Q(payment_type__name='Descontado do Contracheque')
    ):
        from_paycheck_total += exp.amount
    external = total - from_paycheck_total

    # Por tipo de pagamento
    by_payment = list(
        qs.values('payment_type', 'payment_type__name')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    for item in by_payment:
        item['total'] = str(item['total'])
        item['payment_type_name'] = item.pop('payment_type__name', None) or 'Sem tipo'
        item['payment_type'] = str(item['payment_type']) if item['payment_type'] else None

    return Response({
        'period': {'start': start, 'end': end},
        'total': str(total),
        'total_externo': str(external),
        'total_contracheque': str(from_paycheck_total),
        'count': count,
        'by_payment_type': by_payment,
    })


@api_view(['GET'])
def by_category_period(request):
    """
    Despesas por categoria em um período.
    Query params: ?start=2026-01-01&end=2026-06-30&payment_types=uuid1,uuid2
    """
    start = request.query_params.get('start')
    end = request.query_params.get('end')
    payment_types = request.query_params.get('payment_types')

    if not start or not end:
        fm = get_financial_month_for_date(date.today())
        fm_start, fm_end = get_financial_month_range(fm.year, fm.month)
        start = fm_start.isoformat()
        end = fm_end.isoformat()

    qs = Expense.objects.filter(date__gte=start, date__lte=end)
    if payment_types:
        pt_ids = [pt.strip() for pt in payment_types.split(',') if pt.strip()]
        qs = qs.filter(payment_type_id__in=pt_ids)

    data = (
        qs.values('category', 'category__name', 'category__color', 'category__parent')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )

    from apps.categories.models import Category

    result = []
    result_ids = set()
    for item in data:
        cat_id = str(item['category']) if item['category'] else None
        result.append({
            'category_id': cat_id,
            'category_name': item['category__name'] or 'Sem categoria',
            'category_color': item['category__color'] or '#bdbdbd',
            'parent_id': str(item['category__parent']) if item['category__parent'] else None,
            'total': str(item['total']),
            'count': item['count'],
        })
        if cat_id:
            result_ids.add(cat_id)

    # Incluir categorias pai que não têm despesas próprias mas têm filhas no resultado
    parent_ids_needed = set()
    for r in result:
        if r['parent_id'] and r['parent_id'] not in result_ids:
            parent_ids_needed.add(r['parent_id'])

    if parent_ids_needed:
        parents = Category.objects.filter(id__in=parent_ids_needed)
        for cat in parents:
            result.append({
                'category_id': str(cat.id),
                'category_name': cat.name,
                'category_color': cat.color or '#bdbdbd',
                'parent_id': str(cat.parent_id) if cat.parent_id else None,
                'total': '0',
                'count': 0,
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
def expenses_by_category_detail(request):
    """
    Lista despesas de uma categoria específica em um período.
    Query params: ?start=2026-01-01&end=2026-06-30&category=uuid&payment_types=uuid1,uuid2
    Se category_group=true, inclui despesas de todas as subcategorias.
    """
    start = request.query_params.get('start')
    end = request.query_params.get('end')
    category_id = request.query_params.get('category')
    category_group = request.query_params.get('category_group', 'false') == 'true'
    payment_types = request.query_params.get('payment_types')

    if not start or not end:
        fm = get_financial_month_for_date(date.today())
        fm_start, fm_end = get_financial_month_range(fm.year, fm.month)
        start = fm_start.isoformat()
        end = fm_end.isoformat()

    from apps.categories.models import Category

    qs = Expense.objects.filter(date__gte=start, date__lte=end)
    if payment_types:
        pt_ids = [pt.strip() for pt in payment_types.split(',') if pt.strip()]
        qs = qs.filter(payment_type_id__in=pt_ids)

    if category_id:
        if category_group:
            # Incluir a categoria pai + todas as subcategorias
            child_ids = list(
                Category.objects.filter(parent_id=category_id)
                .values_list('id', flat=True)
            )
            all_ids = [category_id] + [str(cid) for cid in child_ids]
            qs = qs.filter(category_id__in=all_ids)
        else:
            qs = qs.filter(category_id=category_id)
    else:
        qs = qs.filter(category__isnull=True)

    qs = qs.select_related('category', 'payment_type', 'credit_card', 'third_party')
    qs = qs.order_by('-date')

    result = []
    for exp in qs:
        result.append({
            'id': str(exp.id),
            'description': exp.description,
            'amount': str(exp.amount),
            'date': exp.date.isoformat(),
            'category_name': exp.category.name if exp.category else None,
            'category': str(exp.category_id) if exp.category_id else None,
            'payment_type_name': exp.payment_type.name if exp.payment_type else None,
            'credit_card_name': exp.credit_card.name if exp.credit_card else None,
            'is_installment': exp.is_installment,
            'installment_current': exp.installment_current,
            'installment_total': exp.installment_total,
            'is_recurring': exp.is_recurring,
            'from_paycheck': exp.from_paycheck,
            'third_party_name': exp.third_party.name if exp.third_party else None,
            'boleto_status': exp.boleto_status,
            'due_day': exp.due_day,
        })

    return Response(result)


@api_view(['GET'])
def installments_projection(request):
    """
    Projeção de parcelas futuras a partir do mês atual.
    Retorna parcelas agrupadas por installment_group_id com parcelas restantes.
    """
    today = date.today()
    fm = get_financial_month_for_date(today)
    fm_start, _ = get_financial_month_range(fm.year, fm.month)
    ref = fm_start

    # Buscar parcelas futuras (data >= início do mês financeiro atual)
    qs = (
        Expense.objects.filter(
            is_installment=True,
            date__gte=ref,
        )
        .select_related('category', 'credit_card')
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
                'credit_card_name': exp.credit_card.name if exp.credit_card else None,
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
    current_fm = get_financial_month_for_date(date.today())

    result = []
    for i in range(months_count - 1, -1, -1):
        # Calcular mês financeiro
        y = current_fm.year
        m = current_fm.month - i
        while m <= 0:
            m += 12
            y -= 1
        ref = date(y, m, 1)

        # Despesas do mês financeiro (excluir descontos do contracheque)
        qs = Expense.objects.filter(
            financial_month=ref,
        ).select_related('payment_type')
        descontos_cc = qs.filter(
            models_Q(from_paycheck=True) | models_Q(payment_type__name='Descontado do Contracheque')
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_despesas = qs.exclude(
            models_Q(from_paycheck=True) | models_Q(payment_type__name='Descontado do Contracheque')
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        count = qs.exclude(
            models_Q(from_paycheck=True) | models_Q(payment_type__name='Descontado do Contracheque')
        ).count()

        # Snapshot salarial
        snapshot = SalarySnapshot.objects.filter(month=ref).first()
        bruto = Decimal(str(snapshot.bruto_total)) if snapshot else Decimal('0')
        remuneracao_liquida = bruto - descontos_cc
        saldo = remuneracao_liquida - total_despesas

        result.append({
            'month': ref.isoformat(),
            'month_label': ref.strftime('%m/%Y'),
            'receita_liquida': str(remuneracao_liquida),
            'total_despesas': str(total_despesas),
            'quantidade_despesas': count,
            'saldo': str(saldo),
        })

    return Response(result)
