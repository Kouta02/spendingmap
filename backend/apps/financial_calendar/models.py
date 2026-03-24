import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class PaymentDate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    year = models.PositiveIntegerField('ano')
    month = models.PositiveIntegerField(
        'mês',
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    payment_day = models.PositiveIntegerField(
        'dia do pagamento',
        validators=[MinValueValidator(1), MaxValueValidator(31)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'data de pagamento'
        verbose_name_plural = 'datas de pagamento'
        ordering = ['year', 'month']
        constraints = [
            models.UniqueConstraint(
                fields=['year', 'month'],
                name='unique_payment_date_per_month',
            ),
        ]

    def __str__(self):
        return f'{self.month:02d}/{self.year} — dia {self.payment_day}'


class CreditCard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=100)
    closing_day = models.PositiveIntegerField(
        'dia de fechamento',
        validators=[MinValueValidator(1), MaxValueValidator(31)],
    )
    due_day = models.PositiveIntegerField(
        'dia de vencimento',
        validators=[MinValueValidator(1), MaxValueValidator(31)],
    )
    is_active = models.BooleanField('ativo', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'cartão de crédito'
        verbose_name_plural = 'cartões de crédito'
        ordering = ['name']

    def __str__(self):
        return self.name
