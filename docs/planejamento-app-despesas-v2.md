# Planejamento — App de Controle de Despesas (v2)

**Stack:** Django (backend) · Angular (frontend) · PostgreSQL (banco de dados)  
**Deploy:** Railway (backend + banco) · Vercel ou Netlify (frontend)  
**Escopo:** Uso pessoal · Dashboard · Relatórios · Metas · Módulo de Remuneração

---

## 1. Visão Geral

Um app web para registrar, visualizar e analisar despesas e receitas mensais de forma completa. Além do controle de gastos, o sistema terá um **módulo de remuneração** que calcula automaticamente o salário com base no padrão atual do cargo (36 a 45), considerando a estrutura remuneratória vigente (pré e pós-reajuste) e todas as deduções do contracheque. O resultado é o saldo mensal real (receita líquida − despesas).

---

## 2. Módulo de Remuneração

Esta é a parte mais técnica e diferenciada do app. As fórmulas foram extraídas do simulador salarial existente.

### 2.1 Contexto: Duas Estruturas Remuneratórias

O sistema precisa suportar duas estruturas diferentes, conforme a data:

| Componente | Estrutura Atual (até março/2026) | Nova Estrutura (a partir de abril/2026) |
|---|---|---|
| Vencimento Básico (VB) | R$ 8.414,75 (padrão 37) | Conforme tabela por padrão e ano |
| GAL | Calculado por fator sobre padrão 45 | Calculado por fator sobre padrão 45 |
| GR | Calculado (fator sobre padrão 45) | Existe em todo o ano de 2026; **zerado a partir de 2027** |
| GD 60% | Calculado sobre VB | **Não existe mais** |
| GD 40% | Calculado sobre VB | **Não existe mais** |
| GDAE 40% | Não existe | `VB × 40%` |
| AEQ | `VB × %` | `VB × %` (mesma lógica) |
| VPI | R$ 84,08 (fixo) | R$ 84,08 (fixo) |
| Auxílio Alimentação | R$ 1.833,54 (fixo) | R$ 1.833,54 (fixo) |

### 2.2 Tabela de Vencimentos — Nova Estrutura

Padrões 36 a 45, por ano de vigência:

| Padrão | 2026 | 2027 | 2028 | 2029 |
|--------|------|------|------|------|
| 45 | R$ 13.753,64 | R$ 17.618,41 | R$ 22.569,18 | R$ 24.181,07 |
| 44 | R$ 13.341,03 | R$ 17.089,85 | R$ 21.892,10 | R$ 23.455,64 |
| 43 | R$ 12.940,78 | R$ 16.577,14 | R$ 21.235,31 | R$ 22.751,94 |
| 42 | R$ 12.552,57 | R$ 16.079,84 | R$ 20.598,28 | R$ 22.069,41 |
| 41 | R$ 12.175,98 | R$ 15.597,43 | R$ 19.980,31 | R$ 21.407,31 |
| 40 | R$ 11.810,70 | R$ 15.129,51 | R$ 19.380,91 | R$ 20.765,09 |
| 39 | R$ 11.456,37 | R$ 14.675,61 | R$ 18.799,45 | R$ 20.142,11 |
| **38** | **R$ 11.112,68** | R$ 14.235,34 | R$ 18.235,47 | R$ 19.537,84 |
| 37 | R$ 10.779,29 | R$ 13.808,28 | R$ 17.688,40 | R$ 18.951,71 |
| 36 | R$ 10.455,93 | R$ 13.394,05 | R$ 17.157,78 | R$ 18.383,18 |

*Padrão atual: 38 (a partir de abril/2026)*

### 2.3 Fórmulas de Cálculo — Nova Estrutura

```
VB          = ANALISTA_SALARIES[padrão][ano]
VB_TOP      = ANALISTA_SALARIES[45][ano]  ← base do padrão máximo

GAL         = VB_TOP × GAL_FACTOR[ano]
              Fatores: 2026=1.20 | 2027=1.13 | 2028=0.74 | 2029=0.74

GR (ano 2026) = 13.753,64 × 0.37 × 1.10  →  R$ 5.608,61 (fixo para todo o ano 2026)
GR (2027+)    = 0

GDAE        = VB × 40%   (percentual configurável pelo usuário)
AEQ         = VB × %AEQ  (percentual configurável, habilitável)
VPI         = R$ 84,08   (fixo, editável)
Alimentação = R$ 1.833,54 (fixo)

# Função Comissionada (FC) — opcional
FC          = VB_TOP × FC_FACTORS[fc_nivel][ano]

Fatores FC (sobre Padrão 45):
  FC-1: 2026=0.23 | 2027=0.20 | 2028=0.16 | 2029=0.16
  FC-2: 2026=0.37 | 2027=0.31 | 2028=0.27 | 2029=0.27
  FC-3: 2026=0.44 | 2027=0.52 | 2028=0.37 | 2029=0.37
  FC-4: 2026=0.66 | 2027=0.56 | 2028=0.47 | 2029=0.47
  FC-5: 2026=0.80 | 2027=0.68 | 2028=0.57 | 2029=0.57
  FC-6: 2026=0.90 | 2027=0.77 | 2028=0.62 | 2029=0.62
  FC-7: 2026=0.85 | 2027=1.00 | 2028=0.67 | 2029=0.67

# Auxílio Creche — opcional
CRECHE      = num_filhos × R$ 1.288,42  (habilitável, por filho)

TOTAL_REMUNERATÓRIO = VB + GAL + GR + GDAE + AEQ + VPI + FC
ABATE_TETO = max(0, TOTAL_REMUNERATÓRIO - 46.366,19)
REMUNERAÇÃO_EFETIVA = TOTAL_REMUNERATÓRIO - ABATE_TETO
```
BRUTO_TOTAL_DISPLAY  = TOTAL_REMUNERATÓRIO + CRECHE + Alimentação  ← exibido no contracheque

### 2.4 Cálculo do PSS (Previdência Social)

Alíquotas progressivas sobre a remuneração efetiva:

| Faixa | Alíquota |
|-------|---------|
| Até R$ 1.518,00 | 7,5% |
| R$ 1.518,01 a R$ 2.793,88 | 9,0% |
| R$ 2.793,89 a R$ 4.190,83 | 12,0% |
| R$ 4.190,84 a R$ 8.475,55 (teto INSS) | 14,0% |
| *Regime antigo — acima do teto INSS:* | |
| R$ 8.475,56 a R$ 13.969,48 | 14,5% |
| R$ 13.969,49 a R$ 27.938,95 | 16,5% |
| R$ 27.938,96 a R$ 54.480,97 | 19,0% |
| Acima de R$ 54.480,97 | 22,0% |

*No regime RPC, o PSS é limitado ao teto INSS (R$ 8.475,55).*

### 2.5 Cálculo do Funpresp (opcional)

```
FUNPRESP = (REMUNERAÇÃO_EFETIVA - 8.475,55) × % Funpresp
           (só se remuneração efetiva > teto INSS)
```

### 2.6 Cálculo do IRPF

```
BASE_IR = REMUNERAÇÃO_EFETIVA - PSS - FUNPRESP - (dependentes × 189,59)

Alíquotas progressivas:
  Até R$ 2.259,20   → isento
  R$ 2.259,21 a R$ 2.826,65 → 7,5% − R$ 169,44
  R$ 2.826,66 a R$ 3.751,05 → 15,0% − R$ 381,44
  R$ 3.751,06 a R$ 4.664,68 → 22,5% − R$ 662,77
  Acima de R$ 4.664,68  → 27,5% − R$ 893,66
```

### 2.7 Despesas Fixas do Contracheque

Estas despesas são registradas automaticamente todo mês como categoria "Contracheque":

| Despesa | Valor | Tipo |
|---------|-------|------|
| Plano de Saúde | R$ 473,71 | Fixo |
| Sindicato | R$ 210,00 | Fixo (sofrerá alteração) |
| Empréstimo Consignado – Bradesco | R$ 871,61 | Parcelado (20/120) |
| Empréstimo Consignado – BB | R$ 3.998,90 | Parcelado (21/120) |
| Empréstimo Consignado – Funpresp | R$ 1.595,19 | Parcelado (16/96) |
| PSS | Calculado | Variável |
| IRPF | Calculado | Variável |
| Funpresp | Calculado | Variável |

PSS, IRPF e Funpresp são calculados automaticamente pelo motor de remuneração — não precisam ser inseridos manualmente. Os demais são registrados como despesas fixas mensais.

### 2.8 Funcionalidades do Módulo de Remuneração no App

- **Configuração do perfil salarial**: padrão atual (36–45), regime previdenciário (RPC ou Antigo), % GDAE, % AEQ, % Funpresp, número de dependentes IR
- **Alternância de estrutura remuneratória**: o app detecta automaticamente qual estrutura aplicar conforme o mês (pré ou pós-abril/2026)
- **Seleção do ano de vigência da tabela**: suporte aos anos 2026, 2027, 2028 e 2029 (com flag de aprovação por ano, como no simulador)
- **Projeção de remuneração**: visualizar a evolução salarial até o padrão 45, com ou sem progressão automática (+1 padrão/ano)
- **Contracheque digital**: exibição detalhada de todos os proventos e descontos do mês
- **Saldo mensal**: receita líquida − total de despesas (incluindo as do contracheque)

---

## 3. Modelo de Dados

### Entidades principais

**SalaryConfig (Configuração Salarial)**
```
id                  → UUID
padrao              → int (36–45)
gdae_perc           → Decimal (ex: 40.0)
aeq_perc            → Decimal (ex: 0.5 para 0,5%)
has_aeq             → bool
vpi                 → Decimal (ex: 84.08)
funpresp_perc       → Decimal (ex: 8.5)
has_funpresp        → bool
funcao_comissionada → str (null | "FC-1" ... "FC-7")
num_filhos          → int (para Auxílio Creche)
has_creche          → bool
dependentes_ir      → int
com_progressao      → bool (simular +1 padrão/ano nas projeções)
approved_years      → JSONField (ex: {"2026": true, "2027": false, ...})
effective_from      → Date (data de início de vigência desta configuração)
```

**SalarySnapshot (Contracheque Mensal Calculado)**
```
id                  → UUID
month               → Date (ano-mês)
padrao              → int
vb                  → Decimal
gal                 → Decimal
gr                  → Decimal
gdae                → Decimal
aeq                 → Decimal
vpi                 → Decimal
alimentacao         → Decimal
bruto_total         → Decimal
abate_teto          → Decimal
pss                 → Decimal
funpresp            → Decimal
irpf                → Decimal
liquido             → Decimal
```

**Expense (Despesa)**
```
id                  → UUID
description         → str
amount              → Decimal
date                → Date
category            → FK → Category
payment_type        → enum: CREDIT / DEBIT / BOLETO / PIX
bank                → FK → Bank
is_installment      → bool
installment_current → int
installment_total   → int
installment_group_id → UUID
is_recurring        → bool
from_paycheck       → bool  ← identifica despesas do contracheque
notes               → str
created_at / updated_at → datetime
```

**Category (Categoria)**
```
id     → UUID
name   → str
icon   → str
color  → str
```

**Bank (Banco)**
```
id    → UUID
name  → str
color → str
```

**Goal (Meta)**
```
id           → UUID
name         → str
category     → FK → Category (opcional)
amount_limit → Decimal
month        → Date
```

---

## 4. Módulos e Funcionalidades

### 4.1 Gestão de Despesas (CRUD)
- Adicionar, editar, excluir despesas
- Cadastrar despesa parcelada (gera N registros automaticamente)
- Cadastrar despesa recorrente (gera registros mensais automaticamente)
- Importar despesas da planilha Excel (.xlsx)
- Filtrar por mês, categoria, banco, tipo de pagamento
- Despesas do contracheque marcadas com flag especial (`from_paycheck`)

### 4.2 Módulo de Remuneração
- Tela de configuração do perfil salarial com todas as personalizações do simulador:
  - Padrão (36–45), com seletor e opção de progressão automática nas projeções
  - Função Comissionada (Nenhuma, FC-1 a FC-7)
  - GDAE % (percentual configurável)
  - AEQ (habilitável + percentual, 0–30%)
  - VPI (valor editável)
  - Funpresp (habilitável + percentual)
  - Auxílio Creche (habilitável + número de filhos)
  - Dependentes IR (quantidade)
  - Tabelas aprovadas por ano (2026 a 2029) — flag individual por ano
  - *(Regime previdenciário: fixo como RPC, sem opção de alteração)*
- Cálculo automático do contracheque ao alterar qualquer parâmetro
- Contracheque digital do mês: proventos, descontos e líquido
- Projeção de remuneração por padrão e por ano (tabela e gráfico)
- Geração automática das despesas fixas do contracheque no mês

### 4.3 Dashboard Principal
- **Saldo do mês**: receita líquida − total de despesas
- Resumo: total bruto, total de descontos, total de despesas externas
- Gráfico de despesas por categoria (donut)
- Gráfico de evolução do saldo mensal (últimos 6 meses)
- Card com alerta de metas próximas do limite

### 4.4 Relatórios
- Extrato mensal completo (despesas externas + contracheque)
- Gastos por categoria em um período
- Projeção de parcelamentos futuros
- Evolução da remuneração líquida por padrão/ano
- Exportar em PDF ou Excel

### 4.5 Metas
- Meta de gasto por categoria por mês
- Meta de gasto total mensal
- Acompanhamento com barra de progresso
- Alerta ao atingir 80% e 100% do limite

### 4.6 Configurações
- Gerenciar padrão salarial e regime previdenciário
- Marcar quais tabelas salariais estão aprovadas (2026–2029)
- Gerenciar categorias e bancos
- Configurar recorrências ativas

---

## 5. Arquitetura Técnica

### Backend — Django + Django REST Framework

```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   └── urls.py
├── apps/
│   ├── expenses/        # Expense + CRUD
│   ├── categories/      # Category
│   ├── banks/           # Bank
│   ├── goals/           # Goal
│   ├── salary/          # SalaryConfig + SalarySnapshot + motor de cálculo
│   ├── reports/         # Agregações e relatórios
│   └── imports/         # Importação .xlsx
├── manage.py
└── requirements.txt
```

O módulo `salary` conterá um `SalaryEngine` (classe Python pura) que encapsula todas as fórmulas de cálculo, facilitando testes unitários isolados.

**Bibliotecas principais:**
- `djangorestframework` — API REST
- `django-cors-headers` — liberar acesso do Angular
- `dj-database-url` — PostgreSQL via URL
- `openpyxl` — leitura/escrita Excel
- `reportlab` ou `weasyprint` — geração de PDF
- `whitenoise` — arquivos estáticos
- `python-decouple` — variáveis de ambiente

### Frontend — Angular

```
frontend/src/app/
├── core/            # interceptors, guards, serviços globais
├── shared/          # componentes reutilizáveis
├── features/
│   ├── dashboard/
│   ├── expenses/
│   ├── salary/      # Contracheque + configuração + projeção
│   ├── reports/
│   ├── goals/
│   └── settings/
└── app.routes.ts
```

**Bibliotecas principais:**
- Angular Material — UI
- ng2-charts ou ngx-echarts — gráficos
- ngx-mask — campos monetários
- date-fns — manipulação de datas

---

## 6. API REST — Principais Endpoints

```
# Despesas
GET    /api/expenses/              → listar (com filtros)
POST   /api/expenses/              → criar
PUT    /api/expenses/{id}/         → editar
DELETE /api/expenses/{id}/         → excluir
POST   /api/expenses/import/       → importar .xlsx

# Categorias e Bancos
GET/POST      /api/categories/
GET/POST      /api/banks/

# Metas
GET/POST      /api/goals/
PUT/DELETE    /api/goals/{id}/

# Remuneração
GET    /api/salary/config/                      → configuração atual
PUT    /api/salary/config/                      → atualizar configuração (padrão, regime, etc.)
GET    /api/salary/calculate/?month=2026-04     → calcular contracheque de um mês
GET    /api/salary/projection/?from=38&to=45    → projeção por padrão
GET    /api/salary/snapshot/{month}/            → contracheque salvo de um mês

# Relatórios
GET    /api/reports/summary/?month=2026-04
GET    /api/reports/by-category/?start=&end=
GET    /api/reports/installments/
GET    /api/reports/export/?format=pdf|xlsx
```

---

## 7. Deploy

### Backend — Railway
- Projeto com serviço Django + serviço PostgreSQL
- Variáveis: `DATABASE_URL`, `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`
- `Procfile`: `web: gunicorn config.wsgi`
- Migrations automáticas no `release command`

### Frontend — Vercel
- Build: `ng build --configuration production`
- `vercel.json` para redirecionar rotas SPA para `index.html`
- Variável de ambiente: `API_URL` apontando para o Railway

---

## 8. Fases de Desenvolvimento Sugeridas

### Fase 1 — Base de Despesas (2 semanas)
- Setup Django + DRF + PostgreSQL
- Models: Expense, Category, Bank
- CRUD completo de despesas via API
- Setup Angular + Angular Material
- Telas: listagem de despesas por mês + formulário de cadastro

### Fase 2 — Módulo de Remuneração (2 semanas)
- `SalaryEngine` Python com todas as fórmulas do simulador
- Models: SalaryConfig, SalarySnapshot
- Endpoints de configuração, cálculo e projeção
- Tela de contracheque no Angular (proventos + descontos + líquido)
- Tela de projeção salarial com tabela e gráfico
- Geração automática das despesas fixas do contracheque

### Fase 3 — Importação e Dashboard (1–2 semanas)
- Endpoint de importação do .xlsx (mapeamento das colunas da planilha atual)
- Dashboard com saldo do mês, gráficos por categoria e evolução mensal

### Fase 4 — Relatórios e Metas (1–2 semanas)
- Endpoints de relatório com agregações
- Tela de relatórios no Angular
- CRUD de metas com barra de progresso
- Exportação em PDF/Excel

### Fase 5 — Polimento e Deploy (1 semana)
- Ajustes de UX/UI
- Configuração de produção (Railway + Vercel)
- Testes e correções finais

---

## 9. Pontos de Atenção

**Remuneração:**
- O `SalaryEngine` deve ser uma classe Python pura (sem dependências de Django), tornando os testes unitários simples e diretos. Os valores das tabelas salariais ficam em um arquivo de configuração separado (ex: `salary_tables.py`), não hardcoded na lógica.
- O app deve armazenar um `SalarySnapshot` por mês após o cálculo, preservando o histórico mesmo que as tabelas mudem no futuro.
- A mudança de estrutura remuneratória (pré e pós-abril/2026) é controlada por `effective_from` no `SalaryConfig`. O sistema aplica automaticamente a estrutura correta com base na data do mês sendo calculado.
- Ao alterar o padrão no app, o sistema recalcula o contracheque do mês atual e oferece a opção de recalcular os meses futuros.

**Despesas:**
- Parcelas devem ser geradas como N registros individuais no banco ao cadastrar, facilitando projeções futuras.
- Assinaturas recorrentes: usar flag `is_recurring` + management command Django rodando mensalmente via cron no Railway.
- As despesas automáticas do contracheque (PSS, IRPF, Funpresp) devem ser marcadas com `from_paycheck=True` e geradas a partir do `SalarySnapshot`, não inseridas manualmente.

**Geral:**
- `TIME_ZONE = 'America/Sao_Paulo'` configurado desde o início.
- Proteger a API com autenticação por token (DRF TokenAuthentication) mesmo para uso pessoal, dado que o app ficará em nuvem.
- Fuso horário: usar sempre `date` (sem time) para campos de mês de referência, evitando problemas de UTC vs. horário de Brasília.
