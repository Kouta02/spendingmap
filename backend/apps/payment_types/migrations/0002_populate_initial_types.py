from django.db import migrations


INITIAL_TYPES = [
    {'name': 'Crédito', 'icon': 'credit_card'},
    {'name': 'Débito', 'icon': 'payment'},
    {'name': 'Boleto', 'icon': 'receipt'},
    {'name': 'PIX', 'icon': 'pix'},
    {'name': 'Saque/Dinheiro', 'icon': 'money'},
]


def populate(apps, schema_editor):
    PaymentType = apps.get_model('payment_types', 'PaymentType')
    for pt in INITIAL_TYPES:
        PaymentType.objects.get_or_create(name=pt['name'], defaults={'icon': pt['icon']})


def reverse(apps, schema_editor):
    PaymentType = apps.get_model('payment_types', 'PaymentType')
    PaymentType.objects.filter(name__in=[pt['name'] for pt in INITIAL_TYPES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payment_types', '0001_create_payment_type'),
    ]

    operations = [
        migrations.RunPython(populate, reverse),
    ]
