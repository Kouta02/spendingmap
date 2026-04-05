# SpendingMap

App pessoal de controle de despesas e receitas com módulo de remuneração do Senado Federal.

**URL:** https://spendingmap.com.br

## Funcionalidades

- **Dashboard** — saldo mensal real (receita líquida − despesas), gráficos por categoria, por cartão de crédito e por pessoa, evolução mensal, saldo encadeado para meses futuros
- **Despesas** — CRUD completo com suporte a parcelamento, recorrência, boletos, filtros por mês/categoria/pessoa/cartão/tipo de pagamento, filtros por coluna estilo Excel
- **Receitas** — CRUD com categorias próprias, recorrência e devolução de cartão de crédito
- **Terceiros** — cadastro de pessoas (familiares, terceiros) para classificar despesas e receitas
- **Categorias** — hierárquicas com subcategorias (N níveis), ícones Material e cores
- **Mês financeiro** — agrupamento por período financeiro baseado nas datas de pagamento do usuário, não pelo mês calendário
- **Cartões de crédito** — cadastro com dia de fechamento e vencimento, integração automática com o mês financeiro
- **Contracheque** — cálculo automático da remuneração (VB, GAL, GR, GDAE, AEQ, VPI, FC) e descontos (PSS, IRPF, Funpresp), geração automática via cron
- **Projeção salarial** — 2026–2029 com progressão automática (+1 padrão/ano)
- **Metas de gasto** — limite por categoria/mês com barra de progresso e alertas (80%/100%)
- **Boletos** — controle com status pendente/pago, alertas via Telegram (3 dias antes, no dia, vencido)
- **Relatórios** — comparativo mensal, despesas por categoria com filtro de período, parcelas futuras
- **Meses futuros** — despesas recorrentes e do contracheque aparecem como previsão (virtuais), confirmadas automaticamente pelo cron
- **Autenticação** — login com token, rotas protegidas

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Django 6.0 + Django REST Framework 3.16 |
| Banco de dados | PostgreSQL |
| Frontend | Angular 21 + Angular Material + ngx-echarts + ngx-mask |
| Deploy | VPS Hostinger (nginx + gunicorn + systemd) |
| SSL | Let's Encrypt |
| Alertas | Telegram Bot API |

## Estrutura

```
spendingmap/
├── backend/
│   ├── config/                  # Settings (base/dev/prod), URLs, WSGI
│   ├── apps/
│   │   ├── categories/          # Categorias hierárquicas + importação xlsx
│   │   ├── expenses/            # Despesas (parceladas, recorrentes, contracheque, boletos)
│   │   ├── incomes/             # Receitas com categorias próprias
│   │   ├── third_parties/       # Terceiros (pessoas para classificar gastos)
│   │   ├── salary/              # SalaryEngine + Config + Snapshot + cron
│   │   ├── goals/               # Metas de gasto por categoria
│   │   ├── payment_types/       # Tipos de pagamento (tabela no banco)
│   │   ├── financial_calendar/  # Mês financeiro, datas de pagamento, cartões de crédito
│   │   ├── dashboard/           # Agregações (resumo, por categoria/cartão/pessoa, evolução)
│   │   └── reports/             # Relatórios (comparativo, por categoria, parcelas)
│   ├── scripts/                 # Scripts de cron (recorrentes, contracheque, telegram)
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── core/                # Models, services, guards, interceptors
│   │   ├── shared/              # Pipes (CurrencyBrl), componentes (ConfirmDialog)
│   │   └── features/
│   │       ├── auth/            # Login
│   │       ├── layout/          # Toolbar + Sidenav responsivo
│   │       ├── dashboard/       # Cards de resumo + gráficos
│   │       ├── expenses/        # Lista (filtros Excel) + formulário
│   │       ├── incomes/         # Lista + formulário
│   │       ├── categories/      # Lista em árvore + formulário
│   │       ├── third-parties/   # Lista + formulário de terceiros
│   │       ├── salary/          # Contracheque, histórico, projeção
│   │       ├── goals/           # Metas de gasto
│   │       ├── settings/        # Tipos de pagamento, datas, cartões de crédito
│   │       └── reports/         # Relatórios (3 abas)
│   ├── proxy.conf.json
│   └── angular.json
└── docs/                        # Documentação local (não versionada)
```

## API

| Endpoint | Descrição |
|---|---|
| `POST /api/auth/login/` | Autenticação → token |
| `/api/categories/` | CRUD + `/tree/` + `/flat/` |
| `/api/third-parties/` | CRUD de terceiros (pessoas) |
| `/api/expenses/` | CRUD + filtros (month, category, third_party, payment_type, credit_card) + `/boleto-alerts/` |
| `/api/incomes/` | CRUD + filtros (month, category, third_party) |
| `/api/salary/config/` | Configuração salarial + `/current/` |
| `/api/salary/snapshots/` | Lista de snapshots (read-only) |
| `/api/salary/calculate/` | Cálculo avulso do contracheque |
| `/api/salary/generate_snapshot/` | Gerar e salvar snapshot mensal |
| `/api/salary/projection/` | Projeção multi-ano |
| `/api/goals/` | CRUD metas + `/alerts/` |
| `/api/payment-types/` | CRUD tipos de pagamento |
| `/api/financial-calendar/` | Datas de pagamento, cartões de crédito, `/current-month/` |
| `/api/dashboard/summary/` | Resumo mensal (saldo encadeado para meses futuros) |
| `/api/dashboard/by-category/` | Despesas por categoria |
| `/api/dashboard/by-credit-card/` | Despesas por cartão de crédito |
| `/api/dashboard/by-third-party/` | Despesas por terceiro |
| `/api/dashboard/evolution/` | Evolução mensal |
| `/api/dashboard/expense-details/` | Detalhamento dos cards (descontos vs despesas) |
| `/api/reports/comparison/` | Comparativo mensal |
| `/api/reports/by-category/` | Despesas por categoria no período |
| `/api/reports/installments/` | Parcelas futuras |

## Setup Local

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # configurar credenciais do banco
python manage.py migrate
python manage.py runserver 0.0.0.0:8003

# Frontend
cd frontend
npm install
npx ng serve --host 0.0.0.0 --port 4201
```

## Deploy

O app roda numa VPS Hostinger com nginx + gunicorn + systemd.

Documentação completa do deploy em `docs/deploy-vps.md`.

```bash
# Na VPS
cd /srv/spendingmap
git pull origin develop

# Frontend
cd frontend && npx ng build --configuration=production

# Backend
cd ../backend && source .venv/bin/activate
set -a && source .env.production && set +a
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py collectstatic --noinput
sudo systemctl restart spendingmap
```

## Branches

- `main` — código estável em produção
- `develop` — integração contínua
- `feature/*` — novas funcionalidades
- `fix/*` — correções de bugs
