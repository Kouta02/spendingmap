# SpendingMap

App pessoal de controle de despesas e receitas com módulo de remuneração do Senado Federal.

**URL:** https://spendingmap.com.br

## Funcionalidades

- **Dashboard** — saldo mensal real (receita líquida − despesas), gráficos por categoria e banco, evolução mensal
- **Despesas** — CRUD completo com suporte a parcelamento, recorrência, filtros por mês/categoria/banco/tipo
- **Categorias** — hierárquicas com subcategorias (N níveis), ícones Material e cores
- **Bancos** — cadastro com cores personalizadas
- **Contracheque** — cálculo automático da remuneração (VB, GAL, GR, GDAE, AEQ, VPI, FC) e descontos (PSS, IRPF, Funpresp)
- **Projeção salarial** — 2026–2029 com progressão automática (+1 padrão/ano)
- **Metas de gasto** — limite por categoria/mês com barra de progresso e alertas (80%/100%)
- **Relatórios** — comparativo mensal, despesas por categoria com filtro de período, parcelas futuras
- **Autenticação** — login com token, rotas protegidas

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Django 6.0 + Django REST Framework 3.16 |
| Banco de dados | PostgreSQL |
| Frontend | Angular 21 + Angular Material + ngx-echarts |
| Deploy | VPS Hostinger (nginx + gunicorn + systemd) |
| SSL | Let's Encrypt |

## Estrutura

```
spendingmap/
├── backend/
│   ├── config/               # Settings (base/dev/prod), URLs, WSGI
│   ├── apps/
│   │   ├── categories/       # Categorias hierárquicas + importação xlsx
│   │   ├── banks/            # Bancos
│   │   ├── expenses/         # Despesas (parceladas, recorrentes, contracheque)
│   │   ├── salary/           # SalaryEngine + Config + Snapshot
│   │   ├── goals/            # Metas de gasto
│   │   ├── dashboard/        # Agregações para o dashboard
│   │   └── reports/          # Relatórios
│   ├── Procfile
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── core/             # Models, services, guards, interceptors
│   │   ├── shared/           # Pipes, componentes reutilizáveis
│   │   └── features/         # auth, dashboard, expenses, categories, banks,
│   │                         # salary, goals, reports, layout
│   ├── proxy.conf.json
│   └── angular.json
└── docs/                     # Documentação local
```

## API

| Endpoint | Descrição |
|---|---|
| `POST /api/auth/login/` | Autenticação → token |
| `/api/categories/` | CRUD + `/tree/` + `/flat/` |
| `/api/banks/` | CRUD |
| `/api/expenses/` | CRUD + filtros (month, category, bank, payment_type) |
| `/api/salary/config/` | Configuração salarial + `/current/` |
| `/api/salary/calculate/` | Cálculo avulso do contracheque |
| `/api/salary/generate_snapshot/` | Gerar e salvar snapshot mensal |
| `/api/salary/projection/` | Projeção multi-ano |
| `/api/goals/` | CRUD metas + `/alerts/` |
| `/api/dashboard/*` | summary, by-category, by-bank, evolution |
| `/api/reports/*` | summary, by-category, installments, comparison |

## Setup Local

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # configurar credenciais do banco
python manage.py migrate
python manage.py runserver 0.0.0.0:8002

# Frontend
cd frontend
npm install
npx ng serve --proxy-config proxy.conf.json --port 4200
```

## Deploy

O app roda numa VPS Hostinger com nginx + gunicorn + systemd.

Documentação completa do deploy em `docs/deploy-vps.md`.

```bash
# Atualizar frontend
cd frontend && npx ng build --configuration=production

# Atualizar backend
cd backend && source .venv/bin/activate
sudo systemctl restart spendingmap
```

## Branches

- `main` — código estável em produção
- `develop` — integração contínua
- `feature/*` — novas funcionalidades
- `fix/*` — correções de bugs
