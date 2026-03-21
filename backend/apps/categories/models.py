import uuid

from django.db import models


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('nome', max_length=100)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='categoria pai',
    )
    icon = models.CharField('ícone', max_length=50, blank=True, default='')
    color = models.CharField('cor', max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'categoria'
        verbose_name_plural = 'categorias'
        ordering = ['name']

    @property
    def full_path(self) -> str:
        """Retorna o caminho completo: 'Assinatura > Serviços Streaming'."""
        parts = [self.name]
        current = self.parent
        while current is not None:
            parts.insert(0, current.name)
            current = current.parent
        return ' > '.join(parts)

    def __str__(self):
        return self.full_path
