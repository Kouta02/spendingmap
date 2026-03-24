import uuid

from django.db import models


class PaymentType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=100)
    icon = models.CharField('ícone', max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'tipo de pagamento'
        verbose_name_plural = 'tipos de pagamento'
        ordering = ['name']

    def __str__(self):
        return self.name
