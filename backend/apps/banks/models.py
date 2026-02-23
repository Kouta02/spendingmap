import uuid

from django.db import models


class Bank(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=100)
    color = models.CharField('cor', max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'banco'
        verbose_name_plural = 'bancos'
        ordering = ['name']

    def __str__(self):
        return self.name
