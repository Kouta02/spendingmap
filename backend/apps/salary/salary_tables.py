"""
Tabelas salariais do cargo de Analista Legislativo do Senado Federal.
Valores aprovados por ano (2026–2029), por padrão (36–45).
"""
from decimal import Decimal

# VB (Vencimento Básico) por padrão e ano
ANALISTA_VB = {
    36: {2026: Decimal('10455.93'), 2027: Decimal('13394.05'), 2028: Decimal('17157.78'), 2029: Decimal('18383.18')},
    37: {2026: Decimal('10779.29'), 2027: Decimal('13808.28'), 2028: Decimal('17688.40'), 2029: Decimal('18951.71')},
    38: {2026: Decimal('11112.68'), 2027: Decimal('14235.34'), 2028: Decimal('18235.47'), 2029: Decimal('19537.84')},
    39: {2026: Decimal('11456.37'), 2027: Decimal('14675.61'), 2028: Decimal('18799.45'), 2029: Decimal('20142.11')},
    40: {2026: Decimal('11810.70'), 2027: Decimal('15129.51'), 2028: Decimal('19380.91'), 2029: Decimal('20765.09')},
    41: {2026: Decimal('12175.98'), 2027: Decimal('15597.43'), 2028: Decimal('19980.31'), 2029: Decimal('21407.31')},
    42: {2026: Decimal('12552.57'), 2027: Decimal('16079.84'), 2028: Decimal('20598.28'), 2029: Decimal('22069.41')},
    43: {2026: Decimal('12940.78'), 2027: Decimal('16577.14'), 2028: Decimal('21235.31'), 2029: Decimal('22751.94')},
    44: {2026: Decimal('13341.03'), 2027: Decimal('17089.85'), 2028: Decimal('21892.10'), 2029: Decimal('23455.64')},
    45: {2026: Decimal('13753.64'), 2027: Decimal('17618.41'), 2028: Decimal('22569.18'), 2029: Decimal('24181.07')},
}

# GAL (Gratificação por Carreira) - fator aplicado sobre VB do padrão 45
GAL_FACTORS = {
    2026: Decimal('1.20'),
    2027: Decimal('1.13'),
    2028: Decimal('0.74'),
    2029: Decimal('0.74'),
}

# GR (Gratificação de Representação) - base fixa, somente 2026
GR_BASE = Decimal('13753.64')
GR_FACTOR = Decimal('0.37')
GR_MULTIPLIER = Decimal('1.10')

# FC (Função Comissionada) - fatores sobre VB do padrão 45
FC_FACTORS = {
    'FC-1': {2026: Decimal('0.23'), 2027: Decimal('0.20'), 2028: Decimal('0.16'), 2029: Decimal('0.16')},
    'FC-2': {2026: Decimal('0.37'), 2027: Decimal('0.31'), 2028: Decimal('0.27'), 2029: Decimal('0.27')},
    'FC-3': {2026: Decimal('0.44'), 2027: Decimal('0.52'), 2028: Decimal('0.37'), 2029: Decimal('0.37')},
    'FC-4': {2026: Decimal('0.66'), 2027: Decimal('0.56'), 2028: Decimal('0.47'), 2029: Decimal('0.47')},
    'FC-5': {2026: Decimal('0.80'), 2027: Decimal('0.68'), 2028: Decimal('0.57'), 2029: Decimal('0.57')},
    'FC-6': {2026: Decimal('0.90'), 2027: Decimal('0.77'), 2028: Decimal('0.62'), 2029: Decimal('0.62')},
    'FC-7': {2026: Decimal('0.85'), 2027: Decimal('1.00'), 2028: Decimal('0.67'), 2029: Decimal('0.67')},
}

# Constantes
TETO_INSS = Decimal('8475.55')
TETO_CONSTITUCIONAL = Decimal('46366.19')
VALE_ALIMENTACAO = Decimal('1833.54')
CRECHE_POR_FILHO = Decimal('1288.42')
VPI_PADRAO = Decimal('84.08')
DEDUCAO_DEPENDENTE_IR = Decimal('189.59')

# PSS - Faixas progressivas (regime RPC, limitado ao teto INSS)
PSS_FAIXAS = [
    (Decimal('1518.00'), Decimal('0.075')),
    (Decimal('2793.88'), Decimal('0.09')),
    (Decimal('4190.83'), Decimal('0.12')),
    (Decimal('8475.55'), Decimal('0.14')),
]

# IRPF - Faixas progressivas
IRPF_FAIXAS = [
    (Decimal('2259.20'), Decimal('0'),     Decimal('0')),
    (Decimal('2826.65'), Decimal('0.075'),  Decimal('169.44')),
    (Decimal('3751.05'), Decimal('0.15'),   Decimal('381.44')),
    (Decimal('4664.68'), Decimal('0.225'),  Decimal('662.77')),
    (Decimal('99999999'), Decimal('0.275'), Decimal('893.66')),
]
