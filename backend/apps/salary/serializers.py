from decimal import Decimal

from rest_framework import serializers

from .models import SalaryConfig, SalarySnapshot


class SalaryConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryConfig
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class SalarySnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalarySnapshot
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class CalculateSerializer(serializers.Serializer):
    """Serializer para calcular contracheque sem salvar."""
    padrao = serializers.IntegerField(min_value=36, max_value=45, default=38)
    year = serializers.IntegerField(min_value=2026, max_value=2029, default=2026)
    gdae_perc = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('40.00'),
    )
    has_aeq = serializers.BooleanField(default=False)
    aeq_perc = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
    )
    vpi = serializers.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('84.08'),
    )
    has_funpresp = serializers.BooleanField(default=False)
    funpresp_perc = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('8.50'),
    )
    funcao_comissionada = serializers.CharField(
        required=False, allow_blank=True, default='',
    )
    has_creche = serializers.BooleanField(default=False)
    num_filhos = serializers.IntegerField(min_value=0, default=0)
    dependentes_ir = serializers.IntegerField(min_value=0, default=0)
    approved_2026 = serializers.BooleanField(default=True)
    approved_2027 = serializers.BooleanField(default=False)
    approved_2028 = serializers.BooleanField(default=False)
    approved_2029 = serializers.BooleanField(default=False)


class SalaryResultSerializer(serializers.Serializer):
    """Serializer de saída com o resultado do cálculo."""
    vb = serializers.DecimalField(max_digits=12, decimal_places=2)
    gal = serializers.DecimalField(max_digits=12, decimal_places=2)
    gr = serializers.DecimalField(max_digits=12, decimal_places=2)
    gdae = serializers.DecimalField(max_digits=12, decimal_places=2)
    aeq = serializers.DecimalField(max_digits=12, decimal_places=2)
    vpi = serializers.DecimalField(max_digits=12, decimal_places=2)
    fc = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_remuneratorio = serializers.DecimalField(max_digits=12, decimal_places=2)
    abate_teto = serializers.DecimalField(max_digits=12, decimal_places=2)
    remuneracao_efetiva = serializers.DecimalField(max_digits=12, decimal_places=2)
    auxilio_alimentacao = serializers.DecimalField(max_digits=12, decimal_places=2)
    auxilio_creche = serializers.DecimalField(max_digits=12, decimal_places=2)
    bruto_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    pss = serializers.DecimalField(max_digits=12, decimal_places=2)
    funpresp = serializers.DecimalField(max_digits=12, decimal_places=2)
    irpf = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_descontos = serializers.DecimalField(max_digits=12, decimal_places=2)
    liquido = serializers.DecimalField(max_digits=12, decimal_places=2)
    padrao = serializers.IntegerField()
    year = serializers.IntegerField()
    effective_year = serializers.IntegerField()


class GenerateSnapshotSerializer(serializers.Serializer):
    """Serializer para gerar e salvar snapshot de um mês."""
    month = serializers.DateField(help_text='Primeiro dia do mês (YYYY-MM-DD)')


class ProjectionSerializer(serializers.Serializer):
    """Serializer para projeção salarial multi-ano."""
    years = serializers.ListField(
        child=serializers.IntegerField(min_value=2026, max_value=2029),
        min_length=1,
        max_length=4,
    )
