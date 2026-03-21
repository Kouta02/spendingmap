import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


FC_CHOICES = [
    ('', 'Nenhuma'),
    ('FC-1', 'FC-1'),
    ('FC-2', 'FC-2'),
    ('FC-3', 'FC-3'),
    ('FC-4', 'FC-4'),
    ('FC-5', 'FC-5'),
    ('FC-6', 'FC-6'),
    ('FC-7', 'FC-7'),
]


class SalaryConfig(models.Model):
    """Configuração pessoal para cálculo do contracheque."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    padrao = models.IntegerField(
        default=38,
        validators=[MinValueValidator(36), MaxValueValidator(45)],
    )
    gdae_perc = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('40.00'),
        validators=[MinValueValidator(Decimal('40')), MaxValueValidator(Decimal('100'))],
        help_text='Percentual GDAE (40–100%)',
    )
    has_aeq = models.BooleanField(default=False)
    aeq_perc = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('30'))],
        help_text='Percentual AEQ (0–30%)',
    )
    vpi = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('84.08'),
    )
    has_funpresp = models.BooleanField(default=False)
    funpresp_perc = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('8.50'),
        validators=[MinValueValidator(Decimal('7.5')), MaxValueValidator(Decimal('8.5'))],
        help_text='Percentual Funpresp (7.5–8.5%)',
    )
    funcao_comissionada = models.CharField(
        max_length=4, blank=True, default='', choices=FC_CHOICES,
    )
    has_creche = models.BooleanField(default=False)
    num_filhos = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    dependentes_ir = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    # Tabelas aprovadas por ano
    approved_2026 = models.BooleanField(default=True)
    approved_2027 = models.BooleanField(default=False)
    approved_2028 = models.BooleanField(default=False)
    approved_2029 = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuração Salarial'
        verbose_name_plural = 'Configurações Salariais'

    def get_approved_years(self) -> dict[int, bool]:
        return {
            2026: self.approved_2026,
            2027: self.approved_2027,
            2028: self.approved_2028,
            2029: self.approved_2029,
        }

    def __str__(self):
        return f'SalaryConfig padrão {self.padrao}'


class SalarySnapshot(models.Model):
    """Contracheque calculado e salvo para histórico."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    month = models.DateField(help_text='Mês de referência (primeiro dia do mês)')
    padrao = models.IntegerField()
    effective_year = models.IntegerField(
        help_text='Ano efetivo usado para as tabelas',
    )

    # Proventos
    vb = models.DecimalField(max_digits=12, decimal_places=2)
    gal = models.DecimalField(max_digits=12, decimal_places=2)
    gr = models.DecimalField(max_digits=12, decimal_places=2)
    gdae = models.DecimalField(max_digits=12, decimal_places=2)
    aeq = models.DecimalField(max_digits=12, decimal_places=2)
    vpi = models.DecimalField(max_digits=12, decimal_places=2)
    fc = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    auxilio_alimentacao = models.DecimalField(max_digits=12, decimal_places=2)
    auxilio_creche = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    bruto_total = models.DecimalField(max_digits=12, decimal_places=2)
    abate_teto = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))

    # Descontos
    pss = models.DecimalField(max_digits=12, decimal_places=2)
    funpresp = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    irpf = models.DecimalField(max_digits=12, decimal_places=2)

    # Líquido
    liquido = models.DecimalField(max_digits=12, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Snapshot Salarial'
        verbose_name_plural = 'Snapshots Salariais'
        ordering = ['-month']
        constraints = [
            models.UniqueConstraint(fields=['month'], name='unique_salary_month'),
        ]

    def __str__(self):
        return f'Snapshot {self.month:%m/%Y} - Padrão {self.padrao}'
