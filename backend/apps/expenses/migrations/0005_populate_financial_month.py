"""
Migração de dados: preenche financial_month das despesas existentes
usando o mês calendário (date.year, date.month, 1) como fallback.
Será recalculado quando o usuário cadastrar as datas de pagamento.
"""
from datetime import date

from django.db import migrations


def populate_financial_month(apps, schema_editor):
    Expense = apps.get_model('expenses', 'Expense')
    for exp in Expense.objects.filter(financial_month__isnull=True):
        exp.financial_month = date(exp.date.year, exp.date.month, 1)
        exp.save(update_fields=['financial_month'])


def reverse_populate(apps, schema_editor):
    Expense = apps.get_model('expenses', 'Expense')
    Expense.objects.all().update(financial_month=None)


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0004_expense_credit_card_expense_financial_month'),
    ]

    operations = [
        migrations.RunPython(populate_financial_month, reverse_populate),
    ]
