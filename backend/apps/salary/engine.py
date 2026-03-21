"""
SalaryEngine — Classe Python pura para cálculo do contracheque.
Sem dependências de Django. Todas as fórmulas seguem a estrutura
remuneratória do cargo de Analista Legislativo do Senado Federal.
"""
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP

from .salary_tables import (
    ANALISTA_VB,
    GAL_FACTORS,
    GR_BASE,
    GR_FACTOR,
    GR_MULTIPLIER,
    FC_FACTORS,
    TETO_INSS,
    TETO_CONSTITUCIONAL,
    VALE_ALIMENTACAO,
    CRECHE_POR_FILHO,
    VPI_PADRAO,
    DEDUCAO_DEPENDENTE_IR,
    PSS_FAIXAS,
    IRPF_FAIXAS,
)

D2 = Decimal('0.01')


def _round(value: Decimal) -> Decimal:
    return value.quantize(D2, rounding=ROUND_HALF_UP)


@dataclass
class SalaryInput:
    """Parâmetros de entrada para o cálculo do contracheque."""
    padrao: int = 38
    year: int = 2026
    gdae_perc: Decimal = Decimal('0.40')
    has_aeq: bool = False
    aeq_perc: Decimal = Decimal('0')
    vpi: Decimal = VPI_PADRAO
    has_funpresp: bool = False
    funpresp_perc: Decimal = Decimal('0.085')
    funcao_comissionada: str | None = None  # None ou "FC-1" a "FC-7"
    has_creche: bool = False
    num_filhos: int = 0
    dependentes_ir: int = 0
    approved_years: dict[int, bool] = field(default_factory=lambda: {
        2026: True, 2027: False, 2028: False, 2029: False,
    })


@dataclass
class SalaryResult:
    """Resultado detalhado do cálculo do contracheque."""
    # Proventos
    vb: Decimal = Decimal('0')
    gal: Decimal = Decimal('0')
    gr: Decimal = Decimal('0')
    gdae: Decimal = Decimal('0')
    aeq: Decimal = Decimal('0')
    vpi: Decimal = Decimal('0')
    fc: Decimal = Decimal('0')
    total_remuneratorio: Decimal = Decimal('0')
    abate_teto: Decimal = Decimal('0')
    remuneracao_efetiva: Decimal = Decimal('0')
    auxilio_alimentacao: Decimal = Decimal('0')
    auxilio_creche: Decimal = Decimal('0')
    bruto_total: Decimal = Decimal('0')
    # Descontos
    pss: Decimal = Decimal('0')
    funpresp: Decimal = Decimal('0')
    irpf: Decimal = Decimal('0')
    total_descontos: Decimal = Decimal('0')
    # Líquido
    liquido: Decimal = Decimal('0')
    # Metadados
    padrao: int = 0
    year: int = 0
    effective_year: int = 0


class SalaryEngine:
    """Motor de cálculo do contracheque — Analista Legislativo do Senado Federal."""

    def calculate(self, inp: SalaryInput) -> SalaryResult:
        r = SalaryResult()
        r.padrao = inp.padrao
        r.year = inp.year

        effective_year = self._get_effective_year(inp.year, inp.approved_years)
        r.effective_year = effective_year

        # --- Proventos ---
        r.vb = self._get_vb(inp.padrao, effective_year)
        r.gal = self._calc_gal(effective_year)
        r.gr = self._calc_gr(inp.year)  # usa o ano real, não o efetivo
        r.gdae = _round(r.vb * inp.gdae_perc)
        r.aeq = _round(r.vb * inp.aeq_perc) if inp.has_aeq else Decimal('0')
        r.vpi = inp.vpi
        r.fc = self._calc_fc(inp.funcao_comissionada, effective_year)

        r.total_remuneratorio = _round(
            r.vb + r.gal + r.gr + r.gdae + r.aeq + r.vpi + r.fc
        )

        # Abate-teto constitucional
        r.abate_teto = _round(max(Decimal('0'), r.total_remuneratorio - TETO_CONSTITUCIONAL))
        r.remuneracao_efetiva = _round(r.total_remuneratorio - r.abate_teto)

        # Auxílios (não entram na remuneração efetiva)
        r.auxilio_alimentacao = VALE_ALIMENTACAO
        r.auxilio_creche = (
            _round(CRECHE_POR_FILHO * inp.num_filhos)
            if inp.has_creche and inp.num_filhos > 0
            else Decimal('0')
        )

        r.bruto_total = _round(
            r.total_remuneratorio + r.auxilio_creche + r.auxilio_alimentacao
        )

        # --- Descontos ---
        r.pss = self._calc_pss(r.remuneracao_efetiva)
        r.funpresp = self._calc_funpresp(
            r.remuneracao_efetiva, inp.has_funpresp, inp.funpresp_perc
        )
        r.irpf = self._calc_irpf(
            r.remuneracao_efetiva, r.pss, r.funpresp, inp.dependentes_ir
        )
        r.total_descontos = _round(r.abate_teto + r.pss + r.funpresp + r.irpf)

        # --- Líquido ---
        r.liquido = _round(r.bruto_total - r.total_descontos)

        return r

    def project(self, inp: SalaryInput, years: list[int]) -> list[SalaryResult]:
        """Calcula projeção salarial para múltiplos anos, com progressão opcional."""
        results = []
        current_padrao = inp.padrao
        for year in years:
            year_input = SalaryInput(
                padrao=min(current_padrao, 45),
                year=year,
                gdae_perc=inp.gdae_perc,
                has_aeq=inp.has_aeq,
                aeq_perc=inp.aeq_perc,
                vpi=inp.vpi,
                has_funpresp=inp.has_funpresp,
                funpresp_perc=inp.funpresp_perc,
                funcao_comissionada=inp.funcao_comissionada,
                has_creche=inp.has_creche,
                num_filhos=inp.num_filhos,
                dependentes_ir=inp.dependentes_ir,
                approved_years=inp.approved_years,
            )
            results.append(self.calculate(year_input))
            current_padrao += 1  # progressão +1/ano
        return results

    # --- Métodos internos ---

    def _get_effective_year(self, target_year: int, approved: dict[int, bool]) -> int:
        """Retorna o ano efetivo para busca de tabelas, baseado nas aprovações."""
        for y in range(target_year, 2025, -1):
            if approved.get(y, False):
                return y
        return 2026  # fallback

    def _get_vb(self, padrao: int, year: int) -> Decimal:
        padrao = max(36, min(45, padrao))
        year_data = ANALISTA_VB.get(padrao, {})
        return year_data.get(year, year_data.get(2026, Decimal('0')))

    def _calc_gal(self, effective_year: int) -> Decimal:
        vb_top = ANALISTA_VB[45].get(effective_year, ANALISTA_VB[45][2026])
        factor = GAL_FACTORS.get(effective_year, GAL_FACTORS[2026])
        return _round(vb_top * factor)

    def _calc_gr(self, real_year: int) -> Decimal:
        """GR existe em todo 2026, zerada a partir de 2027."""
        if real_year <= 2026:
            return _round(GR_BASE * GR_FACTOR * GR_MULTIPLIER)
        return Decimal('0')

    def _calc_fc(self, fc_level: str | None, effective_year: int) -> Decimal:
        if not fc_level or fc_level not in FC_FACTORS:
            return Decimal('0')
        vb_top = ANALISTA_VB[45].get(effective_year, ANALISTA_VB[45][2026])
        factor = FC_FACTORS[fc_level].get(effective_year, Decimal('0'))
        return _round(vb_top * factor)

    def _calc_pss(self, remuneracao_efetiva: Decimal) -> Decimal:
        """PSS no regime RPC — base limitada ao teto INSS."""
        base = min(remuneracao_efetiva, TETO_INSS)
        pss = Decimal('0')
        prev_limit = Decimal('0')
        for limit, rate in PSS_FAIXAS:
            if base <= prev_limit:
                break
            taxable = min(base, limit) - prev_limit
            pss += taxable * rate
            prev_limit = limit
        return _round(pss)

    def _calc_funpresp(
        self,
        remuneracao_efetiva: Decimal,
        has_funpresp: bool,
        funpresp_perc: Decimal,
    ) -> Decimal:
        if not has_funpresp:
            return Decimal('0')
        excess = remuneracao_efetiva - TETO_INSS
        if excess <= 0:
            return Decimal('0')
        return _round(excess * funpresp_perc)

    def _calc_irpf(
        self,
        remuneracao_efetiva: Decimal,
        pss: Decimal,
        funpresp: Decimal,
        dependentes: int,
    ) -> Decimal:
        deducao_dep = _round(DEDUCAO_DEPENDENTE_IR * dependentes)
        base_ir = remuneracao_efetiva - pss - funpresp - deducao_dep

        if base_ir <= IRPF_FAIXAS[0][0]:
            return Decimal('0')

        for limit, rate, deduction in IRPF_FAIXAS:
            if base_ir <= limit:
                return _round(base_ir * rate - deduction)

        # Última faixa (fallback)
        _, rate, deduction = IRPF_FAIXAS[-1]
        return _round(base_ir * rate - deduction)
