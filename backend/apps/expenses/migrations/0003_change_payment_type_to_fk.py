"""
Migração em 4 etapas para converter payment_type de CharField para ForeignKey:
1. Adiciona campo temporário payment_type_new (FK)
2. Copia dados: mapeia strings antigas para os UUIDs dos PaymentTypes
3. Remove campo antigo payment_type
4. Renomeia payment_type_new para payment_type
"""
import django.db.models.deletion
from django.db import migrations, models


# Mapeamento nome antigo -> nome no PaymentType
OLD_TO_NEW = {
    'CREDIT': 'Crédito',
    'DEBIT': 'Débito',
    'BOLETO': 'Boleto',
    'PIX': 'PIX',
    'CASH': 'Saque/Dinheiro',
}


def migrate_data(apps, schema_editor):
    Expense = apps.get_model('expenses', 'Expense')
    PaymentType = apps.get_model('payment_types', 'PaymentType')

    # Construir mapeamento code -> PaymentType instance
    pt_map = {}
    for old_code, new_name in OLD_TO_NEW.items():
        try:
            pt_map[old_code] = PaymentType.objects.get(name=new_name)
        except PaymentType.DoesNotExist:
            pass

    # Atualizar cada despesa
    for expense in Expense.objects.all():
        old_value = expense.payment_type_old
        if old_value and old_value in pt_map:
            expense.payment_type_new = pt_map[old_value]
            expense.save(update_fields=['payment_type_new'])


def reverse_data(apps, schema_editor):
    # Reversão não é necessária pois o campo antigo ainda existe neste ponto
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0002_alter_expense_payment_type'),
        ('payment_types', '0002_populate_initial_types'),
    ]

    operations = [
        # 1. Renomear campo antigo para payment_type_old
        migrations.RenameField(
            model_name='expense',
            old_name='payment_type',
            new_name='payment_type_old',
        ),
        # 2. Adicionar novo campo FK como payment_type_new
        migrations.AddField(
            model_name='expense',
            name='payment_type_new',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='+',
                to='payment_types.paymenttype',
                verbose_name='tipo de pagamento',
            ),
        ),
        # 3. Copiar dados do campo antigo para o novo
        migrations.RunPython(migrate_data, reverse_data),
        # 4. Remover campo antigo
        migrations.RemoveField(
            model_name='expense',
            name='payment_type_old',
        ),
        # 5. Renomear novo campo para payment_type
        migrations.RenameField(
            model_name='expense',
            old_name='payment_type_new',
            new_name='payment_type',
        ),
        # 6. Ajustar related_name para o definitivo
        migrations.AlterField(
            model_name='expense',
            name='payment_type',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='expenses',
                to='payment_types.paymenttype',
                verbose_name='tipo de pagamento',
            ),
        ),
    ]
