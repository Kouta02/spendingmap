"""
Management command para enviar alertas de boletos pendentes via Telegram.
Deve ser executado diariamente via cron.

Envia notificação quando:
- Faltam 3 dias para o vencimento
- Vence hoje
- Está vencido (todo dia até ser marcado como pago)
"""
import calendar
import urllib.request
import urllib.parse
import json
from datetime import date

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.expenses.models import Expense


class Command(BaseCommand):
    help = 'Envia alertas de boletos pendentes via Telegram.'

    def handle(self, *args, **options):
        token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)

        if not token or not chat_id:
            self.stdout.write(self.style.WARNING(
                'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados. Pulando alertas.'
            ))
            return

        today = date.today()

        # Boletos pendentes
        pending = Expense.objects.filter(
            boleto_status='pending',
            due_day__isnull=False,
        ).select_related('payment_type')

        overdue = []
        due_today = []
        due_3_days = []

        for exp in pending:
            exp_year = exp.date.year
            exp_month = exp.date.month
            max_day = calendar.monthrange(exp_year, exp_month)[1]
            due_date = date(exp_year, exp_month, min(exp.due_day, max_day))

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
