"""
Management command para enviar alertas de boletos pendentes via Telegram.
Deve ser executado diariamente via cron.

Envia notificação quando:
- Faltam 3 dias para o vencimento
- Vence hoje
- Está vencido (todo dia até ser marcado como pago)

Considera tanto boletos reais (`boleto_status='pending'`) quanto boletos
previstos — ocorrências recorrentes ainda não materializadas no banco
cujo vencimento cai dentro da janela de alerta.
"""
import urllib.request
import urllib.parse
import json
from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.expenses.models import Expense
from apps.financial_calendar.services import (
    get_boleto_due_date,
    get_financial_month_for_date,
    get_recurring_next_date,
)


def _build_predicted_boletos(today):
    """
    Retorna lista de boletos previstos (recorrentes não materializados) para
    os meses financeiros que tocam a janela de alerta [today, today+3].

    Cada item é uma instância Expense em memória (não salva), preenchida o
    suficiente para `get_boleto_due_date` funcionar e para a mensagem ser
    montada (description, amount, due_day, financial_month, date).
    """
    fm_today = get_financial_month_for_date(today)
    fm_window = get_financial_month_for_date(today + timedelta(days=3))
    target_fms = {fm_today, fm_window}

    descriptions = (
        Expense.objects
        .filter(is_recurring=True)
        .order_by()
        .values_list('description', flat=True)
        .distinct()
    )

    predicted = []
    for desc in descriptions:
        latest = (
            Expense.objects
            .filter(is_recurring=True, description=desc)
            .select_related('payment_type')
            .order_by('-financial_month')
            .first()
        )
        if not latest or not latest.due_day:
            continue
        if not (latest.payment_type and latest.payment_type.name.lower() == 'boleto'):
            continue

        latest_fm = latest.financial_month or get_financial_month_for_date(latest.date)

        for target_fm in target_fms:
            if target_fm <= latest_fm:
                continue
            if latest.recurrence_ends_at and target_fm >= latest.recurrence_ends_at:
                continue
            if Expense.objects.filter(
                is_recurring=True, description=desc, financial_month=target_fm,
            ).exists():
                continue

            predicted.append(Expense(
                description=latest.description,
                amount=latest.amount,
                due_day=latest.due_day,
                financial_month=target_fm,
                date=get_recurring_next_date(latest, target_fm),
            ))

    return predicted


class Command(BaseCommand):
    help = 'Envia alertas de boletos pendentes via Telegram (inclui previstos).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostra a mensagem que seria enviada, sem chamar a API do Telegram.',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)

        if not dry_run and (not token or not chat_id):
            self.stdout.write(self.style.WARNING(
                'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados. Pulando alertas.'
            ))
            return

        today = date.today()

        # Boletos reais pendentes + previstos (recorrentes ainda não materializados)
        real_pending = Expense.objects.filter(
            boleto_status='pending',
            due_day__isnull=False,
        ).select_related('payment_type')
        candidates = list(real_pending) + _build_predicted_boletos(today)

        overdue = []
        due_today = []
        due_3_days = []

        for exp in candidates:
            due_date = get_boleto_due_date(exp)
            if not due_date:
                continue

            days_until = (due_date - today).days

            if days_until < 0:
                overdue.append((exp, due_date, abs(days_until)))
            elif days_until == 0:
                due_today.append((exp, due_date))
            elif days_until == 3:
                due_3_days.append((exp, due_date))

        # Se não há alertas, não enviar nada
        if not overdue and not due_today and not due_3_days:
            self.stdout.write('Nenhum alerta de boleto para enviar.')
            return

        # Montar mensagem
        lines = ['📋 *SpendingMap — Alertas de Boletos*', '']

        if overdue:
            lines.append('🔴 *VENCIDOS:*')
            for exp, due_date, days in sorted(overdue, key=lambda x: x[2], reverse=True):
                lines.append(
                    f'   • {exp.description} — R$ {exp.amount:,.2f} '
                    f'(venceu {due_date.strftime("%d/%m")} — {days} dia{"s" if days > 1 else ""})'
                )
            lines.append('')

        if due_today:
            lines.append('🟠 *VENCEM HOJE:*')
            for exp, due_date in due_today:
                lines.append(f'   • {exp.description} — R$ {exp.amount:,.2f}')
            lines.append('')

        if due_3_days:
            lines.append('🟡 *Faltam 3 dias:*')
            for exp, due_date in due_3_days:
                lines.append(
                    f'   • {exp.description} — R$ {exp.amount:,.2f} '
                    f'(vence {due_date.strftime("%d/%m")})'
                )

        message = '\n'.join(lines)

        if dry_run:
            self.stdout.write('--- DRY RUN — mensagem que seria enviada ---')
            self.stdout.write(message)
            return

        # Enviar via Telegram
        url = f'https://api.telegram.org/bot{token}/sendMessage'
        data = urllib.parse.urlencode({
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'Markdown',
        }).encode('utf-8')

        try:
            req = urllib.request.Request(url, data=data, method='POST')
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
                if result.get('ok'):
                    self.stdout.write(self.style.SUCCESS('Alerta enviado com sucesso!'))
                else:
                    self.stdout.write(self.style.ERROR(f'Erro Telegram: {result}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erro ao enviar alerta: {e}'))
