import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Goal(models.Model):
    """Meta de gasto mensal, opcionalmente vinculada a uma categoria."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=150)
    category = models.ForeignKey(
        'categories.Category',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='goals',
        verbose_name='categoria',
        help_text='Se vazio, aplica ao total de despesas do mês.',
    )
    amount_limit = models.DecimalField(
        'limite', max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    month = models.DateField(
        'mês de referência',
        help_text='Primeiro dia do mês (ex: 2026-03-01)',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'meta'
        verbose_name_plural = 'metas'
        ordering = ['-month', 'name']

    def __str__(self):
        return f'{self.name} — R$ {self.amount_limit} ({self.month:%m/%Y})'
