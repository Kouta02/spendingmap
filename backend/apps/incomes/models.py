import uuid

from django.db import models


class IncomeCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=100)
    icon = models.CharField('ícone', max_length=50, blank=True, default='')
    color = models.CharField('cor', max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'categoria de receita'
        verbose_name_plural = 'categorias de receita'
        ordering = ['name']

    def __str__(self):
        return self.name


class Income(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.CharField('descrição', max_length=255)
    amount = models.DecimalField('valor', max_digits=12, decimal_places=2)
    date = models.DateField('data')
    category = models.ForeignKey(
        IncomeCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incomes',
        verbose_name='categoria',
    )
    bank = models.ForeignKey(
        'banks.Bank',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incomes',
        verbose_name='banco',
    )
    is_recurring = models.BooleanField('é recorrente', default=False)
    notes = models.TextField('observações', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'receita'
        verbose_name_plural = 'receitas'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.description} — R$ {self.amount}'
