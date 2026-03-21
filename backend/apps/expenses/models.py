import uuid

from django.db import models


class Expense(models.Model):
    class PaymentType(models.TextChoices):
        CREDIT = 'CREDIT', 'Crédito'
        DEBIT = 'DEBIT', 'Débito'
        BOLETO = 'BOLETO', 'Boleto'
        PIX = 'PIX', 'Pix'
        CASH = 'CASH', 'Saque/Dinheiro'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.CharField('descrição', max_length=255)
    amount = models.DecimalField('valor', max_digits=12, decimal_places=2)
    date = models.DateField('data')
    category = models.ForeignKey(
        'categories.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        verbose_name='categoria',
    )
    payment_type = models.CharField(
        'tipo de pagamento',
        max_length=10,
        choices=PaymentType.choices,
        default=PaymentType.PIX,
    )
    bank = models.ForeignKey(
        'banks.Bank',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        verbose_name='banco',
    )
    is_installment = models.BooleanField('é parcelada', default=False)
    installment_current = models.PositiveIntegerField('parcela atual', null=True, blank=True)
    installment_total = models.PositiveIntegerField('total de parcelas', null=True, blank=True)
    installment_group_id = models.UUIDField(
        'grupo de parcelas',
        null=True,
        blank=True,
        db_index=True,
    )
    is_recurring = models.BooleanField('é recorrente', default=False)
    from_paycheck = models.BooleanField('do contracheque', default=False)
    notes = models.TextField('observações', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'despesa'
        verbose_name_plural = 'despesas'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.description} — R$ {self.amount}'
