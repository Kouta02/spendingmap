import uuid

from django.db import models


class Expense(models.Model):
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
    payment_type = models.ForeignKey(
        'payment_types.PaymentType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        verbose_name='tipo de pagamento',
    )
    third_party = models.ForeignKey(
        'third_parties.ThirdParty',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        verbose_name='terceiro',
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
    credit_card = models.ForeignKey(
        'financial_calendar.CreditCard',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        verbose_name='cartão de crédito',
    )
    financial_month = models.DateField(
        'mês financeiro',
        null=True,
        blank=True,
        db_index=True,
        help_text='Primeiro dia do mês financeiro (calculado automaticamente)',
    )
    is_recurring = models.BooleanField('é recorrente', default=False)
    recurrence_ends_at = models.DateField(
        'recorrência termina em',
        null=True,
        blank=True,
        db_index=True,
        help_text='Mês financeiro (1º dia) a partir do qual esta recorrente para de ser gerada',
    )
    from_paycheck = models.BooleanField('do contracheque', default=False)
    due_day = models.PositiveIntegerField(
        'dia de vencimento',
        null=True,
        blank=True,
        help_text='Dia do mês em que o boleto vence (1-31)',
    )
    boleto_status = models.CharField(
        'status do boleto',
        max_length=10,
        choices=[
            ('pending', 'Pendente'),
            ('paid', 'Pago'),
        ],
        null=True,
        blank=True,
        help_text='Status do boleto (somente para despesas tipo boleto)',
    )
    notes = models.TextField('observações', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'despesa'
        verbose_name_plural = 'despesas'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.description} — R$ {self.amount}'
