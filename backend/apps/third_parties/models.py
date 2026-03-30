import uuid

from django.db import models


class ThirdParty(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=100)
    relationship = models.CharField('parentesco/relação', max_length=100, blank=True, default='')
    notes = models.TextField('observações', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'terceiro'
        verbose_name_plural = 'terceiros'
        ordering = ['name']

    def __str__(self):
        return self.name
