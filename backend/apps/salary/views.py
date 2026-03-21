from dataclasses import asdict
from decimal import Decimal

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .engine import SalaryEngine, SalaryInput
from .models import SalaryConfig, SalarySnapshot
from .serializers import (
    SalaryConfigSerializer,
    SalarySnapshotSerializer,
    CalculateSerializer,
    SalaryResultSerializer,
    GenerateSnapshotSerializer,
    ProjectionSerializer,
)


class SalaryConfigViewSet(viewsets.ModelViewSet):
    """CRUD para configuração salarial (singleton na prática)."""
    queryset = SalaryConfig.objects.all()
    serializer_class = SalaryConfigSerializer

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Retorna a configuração atual (cria uma default se não existir)."""
        config = SalaryConfig.objects.first()
        if not config:
            config = SalaryConfig.objects.create()
        return Response(SalaryConfigSerializer(config).data)


class SalarySnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    """Lista e detalha snapshots (contracheques salvos)."""
    queryset = SalarySnapshot.objects.all()
    serializer_class = SalarySnapshotSerializer


def _build_input(config: SalaryConfig, year: int) -> SalaryInput:
    """Converte SalaryConfig + ano em SalaryInput para o engine."""
    return SalaryInput(
        padrao=config.padrao,
        year=year,
        gdae_perc=config.gdae_perc / 100,
        has_aeq=config.has_aeq,
        aeq_perc=config.aeq_perc / 100 if config.has_aeq else Decimal('0'),
        vpi=config.vpi,
        has_funpresp=config.has_funpresp,
        funpresp_perc=config.funpresp_perc / 100,
        funcao_comissionada=config.funcao_comissionada or None,
        has_creche=config.has_creche,
        num_filhos=config.num_filhos,
        dependentes_ir=config.dependentes_ir,
        approved_years=config.get_approved_years(),
    )


class SalaryCalculationViewSet(viewsets.ViewSet):
    """Endpoints de cálculo salarial."""

    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calcula contracheque com parâmetros avulsos (sem salvar)."""
        serializer = CalculateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        inp = SalaryInput(
            padrao=d['padrao'],
            year=d['year'],
            gdae_perc=d['gdae_perc'] / 100,
            has_aeq=d['has_aeq'],
            aeq_perc=d['aeq_perc'] / 100 if d['has_aeq'] else Decimal('0'),
            vpi=d['vpi'],
            has_funpresp=d['has_funpresp'],
            funpresp_perc=d['funpresp_perc'] / 100,
            funcao_comissionada=d['funcao_comissionada'] or None,
            has_creche=d['has_creche'],
            num_filhos=d['num_filhos'],
            dependentes_ir=d['dependentes_ir'],
            approved_years={
                2026: d['approved_2026'],
                2027: d['approved_2027'],
                2028: d['approved_2028'],
                2029: d['approved_2029'],
            },
        )

        engine = SalaryEngine()
        result = engine.calculate(inp)
        return Response(SalaryResultSerializer(asdict(result)).data)

    @action(detail=False, methods=['post'])
    def generate_snapshot(self, request):
        """Calcula e salva o contracheque para um mês usando a config atual."""
        ser = GenerateSnapshotSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        month = ser.validated_data['month'].replace(day=1)

        config = SalaryConfig.objects.first()
        if not config:
            return Response(
                {'detail': 'Nenhuma configuração salarial encontrada. Crie uma primeiro.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inp = _build_input(config, month.year)
        engine = SalaryEngine()
        result = engine.calculate(inp)

        snapshot, created = SalarySnapshot.objects.update_or_create(
            month=month,
            defaults={
                'padrao': result.padrao,
                'effective_year': result.effective_year,
                'vb': result.vb,
                'gal': result.gal,
                'gr': result.gr,
                'gdae': result.gdae,
                'aeq': result.aeq,
                'vpi': result.vpi,
                'fc': result.fc,
                'auxilio_alimentacao': result.auxilio_alimentacao,
                'auxilio_creche': result.auxilio_creche,
                'bruto_total': result.bruto_total,
                'abate_teto': result.abate_teto,
                'pss': result.pss,
                'funpresp': result.funpresp,
                'irpf': result.irpf,
                'liquido': result.liquido,
            },
        )

        return Response(
            SalarySnapshotSerializer(snapshot).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'])
    def projection(self, request):
        """Projeção salarial com progressão automática (+1 padrão/ano)."""
        ser = ProjectionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        years = ser.validated_data['years']

        config = SalaryConfig.objects.first()
        if not config:
            return Response(
                {'detail': 'Nenhuma configuração salarial encontrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inp = _build_input(config, years[0])
        engine = SalaryEngine()
        results = engine.project(inp, years)

        return Response(
            SalaryResultSerializer([asdict(r) for r in results], many=True).data
        )
