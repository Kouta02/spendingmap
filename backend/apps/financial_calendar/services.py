"""
Lógica de cálculo do mês financeiro e ciclos de fatura de cartão de crédito.

Regras:
- Mês financeiro X: da data de pagamento do mês anterior (inclusive)
  até a véspera da data de pagamento do mês X (inclusive).
- Compras no crédito: a competência é o mês financeiro onde cai o
  vencimento da fatura correspondente.
"""

import calendar
from datetime import date, timedelta


def get_payment_dates_map(year):
    """Retorna dict {month: payment_day} para o ano, incluindo dez do ano anterior."""
    from .models import PaymentDate

    result = {}

    # Dezembro do ano anterior (necessário para calcular janeiro)
    dec_prev = PaymentDate.objects.filter(year=year - 1, month=12).first()
    if dec_prev:
        result[0] = dec_prev.payment_day  # key 0 = dezembro ano anterior

    # Meses do ano solicitado
    for pd in PaymentDate.objects.filter(year=year):
        result[pd.month] = pd.payment_day

    return result


def build_financial_months(year):
    """
    Constrói a lista de meses financeiros para o ano.

    Retorna lista de dicts:
    [
        {
            'month': 1,
            'label': 'Janeiro',
            'start': date(2025, 12, 22),
            'end': date(2026, 1, 20),
        },
        ...
    ]
    """
    payment_map = get_payment_dates_map(year)
    months = []

    month_labels = [
        '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ]

    for m in range(1, 13):
        # Data de pagamento do mês anterior
        if m == 1:
            if 0 in payment_map:
                start = date(year - 1, 12, payment_map[0])
            else:
                start = date(year, 1, 1)  # fallback
        else:
            if (m - 1) in payment_map:
                prev_day = payment_map[m - 1]
                max_day = calendar.monthrange(year, m - 1)[1]
                start = date(year, m - 1, min(prev_day, max_day))
            else:
                start = date(year, m, 1)  # fallback

        # Véspera da data de pagamento do mês atual
        if m in payment_map:
            pay_day = payment_map[m]
            max_day = calendar.monthrange(year, m)[1]
            end = date(year, m, min(pay_day, max_day)) - timedelta(days=1)
        else:
            # Fallback: último dia do mês
            max_day = calendar.monthrange(year, m)[1]
            end = date(year, m, max_day)

        months.append({
            'month': m,
            'label': month_labels[m],
            'start': start,
            'end': end,
        })

    return months


def get_financial_month_for_date(expense_date):
    """
    Determina o mês financeiro de uma data.

    Retorna date(year, month, 1) representando o mês financeiro,
    ou None se não for possível determinar.
    """
    # Verificar no ano da despesa e no ano seguinte (para datas no final de dezembro)
    for year in [expense_date.year, expense_date.year + 1]:
        months = build_financial_months(year)
        for fm in months:
            if fm['start'] <= expense_date <= fm['end']:
                return date(year, fm['month'], 1)

    # Verificar no ano anterior (para datas no início de janeiro)
    months = build_financial_months(expense_date.year - 1)
    for fm in months:
        if fm['start'] <= expense_date <= fm['end']:
            return date(expense_date.year - 1, fm['month'], 1)

    # Fallback: usar o mês calendário
    return date(expense_date.year, expense_date.month, 1)


def get_financial_month_range(year, month):
    """
    Retorna (start, end) do mês financeiro especificado.

    Se não houver datas de pagamento cadastradas, retorna o mês calendário.
    """
    months = build_financial_months(year)
    for fm in months:
        if fm['month'] == month:
            return fm['start'], fm['end']

    # Fallback
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, max_day)


def get_credit_card_financial_month(purchase_date, credit_card):
    """
    Determina o mês financeiro de uma compra no cartão de crédito.

    Lógica:
    1. Identifica em qual ciclo de fatura a compra se encaixa
    2. Determina a data de vencimento dessa fatura
    3. O mês financeiro é aquele cuja faixa contém a data de vencimento
    """
    closing_day = credit_card.closing_day
    due_day = credit_card.due_day

    # Determinar em qual mês a fatura fecha
    if purchase_date.day < closing_day:
        # Compra antes do fechamento: fatura fecha neste mês
        closing_month = purchase_date.month
        closing_year = purchase_date.year
    else:
        # Compra após o fechamento: fatura fecha no próximo mês
        if purchase_date.month == 12:
            closing_month = 1
            closing_year = purchase_date.year + 1
        else:
            closing_month = purchase_date.month + 1
            closing_year = purchase_date.year

    # Determinar a data de vencimento da fatura
    # O vencimento é no mês seguinte ao fechamento (quando due_day < closing_day)
    # ou no mesmo mês (quando due_day > closing_day)
    if due_day <= closing_day:
        # Vencimento no mês seguinte ao fechamento
        if closing_month == 12:
            due_month = 1
            due_year = closing_year + 1
        else:
            due_month = closing_month + 1
            due_year = closing_year
    else:
        # Vencimento no mesmo mês do fechamento
        due_month = closing_month
        due_year = closing_year

    max_day = calendar.monthrange(due_year, due_month)[1]
    due_date = date(due_year, due_month, min(due_day, max_day))

    # Encontrar o mês financeiro que contém a data de vencimento
    return get_financial_month_for_date(due_date)
