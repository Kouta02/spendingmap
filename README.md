# SpendingMap

Aplicacao pessoal de controle financeiro, com despesas, receitas, metas, relatorios, mes financeiro, cartoes de credito e modulo de remuneracao do Senado Federal.

**URL de producao:** https://spendingmap.com.br

## Visao geral

O projeto e um monorepo com duas aplicacoes:

```text
spendingmap/
├── backend/     # Django + Django REST Framework
├── frontend/    # Angular + Angular Material
└── docs/        # Documentacao local do projeto
```

O frontend consome a API pelo prefixo `/api`. Em desenvolvimento, o proxy do Angular envia essas chamadas para o backend em `http://localhost:8003`.

```text
Angular
  -> /api
  -> Django REST Framework
  -> PostgreSQL
```

## Funcionalidades

- **Dashboard**: saldo mensal, receitas, despesas, saldo encadeado, graficos por categoria, cartao e terceiro.
- **Despesas**: CRUD, filtros, parcelamento, recorrencia, boletos, status de pagamento e despesas previstas.
- **Receitas**: CRUD, categorias proprias, recorrencia e devolucoes vinculadas a cartao de credito.
- **Categorias**: categorias hierarquicas com subcategorias, icones e cores.
- **Terceiros**: pessoas ou entidades usadas para classificar despesas e receitas.
- **Tipos de pagamento**: cadastro em tabela propria, usado pelas despesas.
- **Mes financeiro**: agrupamento baseado nas datas de pagamento, nao no mes calendario.
- **Cartoes de credito**: competencia calculada pelo vencimento da fatura dentro do mes financeiro.
- **Contracheque**: calculo de remuneracao, descontos, snapshot mensal e projecao salarial.
- **Metas**: limite mensal por categoria ou total do mes, com status de acompanhamento.
- **Boletos**: vencimento, status pendente/pago e alertas.
- **Relatorios**: resumo por periodo, categorias, parcelas futuras e comparativo mensal.
- **Autenticacao**: login com token e rotas protegidas no frontend.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Django 6.0 + Django REST Framework 3.16 |
| Banco de dados | PostgreSQL |
| Frontend | Angular 21 + Angular Material |
| Graficos | ECharts + ngx-echarts |
| Datas e mascaras | date-fns + ngx-mask |
| Deploy | VPS com nginx + gunicorn + systemd |
| SSL | Let's Encrypt |
| Alertas externos | Telegram Bot API |

## Estrutura do backend

```text
backend/
├── manage.py
├── requirements.txt
├── runtime.txt
├── Procfile
├── config/
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   └── settings/
│       ├── base.py
│       ├── development.py
│       └── production.py
├── apps/
│   ├── categories/
│   ├── third_parties/
│   ├── payment_types/
│   ├── expenses/
│   ├── incomes/
│   ├── financial_calendar/
│   ├── salary/
│   ├── dashboard/
│   ├── reports/
│   ├── goals/
│   └── banks/              # legado/descontinuado, sem rota publica atual
└── scripts/
```

### Apps principais

| App | Responsabilidade |
|---|---|
| `categories` | Categorias hierarquicas de despesas, com endpoint em arvore e lista plana. |
| `third_parties` | Cadastro de pessoas/terceiros para classificar movimentacoes. |
| `payment_types` | Tipos de pagamento usados por despesas. |
| `expenses` | Despesas, parcelas, boletos, recorrencias, descontos de contracheque e previsoes virtuais. |
| `incomes` | Receitas e categorias de receita. |
| `financial_calendar` | Datas de pagamento, meses financeiros e cartoes de credito. |
| `salary` | Configuracao salarial, calculo de contracheque, snapshots e projecoes. |
| `dashboard` | Agregacoes para a tela inicial. |
| `reports` | Relatorios por periodo, categoria, parcelas e comparativos. |
| `goals` | Metas mensais de gasto. |
| `banks` | App legado. A funcionalidade de bancos foi descontinuada e nao esta exposta em `config/urls.py`. |

## Estrutura do frontend

```text
frontend/
├── angular.json
├── package.json
├── proxy.conf.json
└── src/app/
    ├── app.config.ts
    ├── app.routes.ts
    ├── core/
    │   ├── guards/
    │   ├── interceptors/
    │   ├── models/
    │   └── services/
    ├── shared/
    │   ├── components/
    │   └── pipes/
    └── features/
        ├── auth/
        ├── layout/
        ├── dashboard/
        ├── expenses/
        ├── incomes/
        ├── categories/
        ├── third-parties/
        ├── settings/
        ├── salary/
        ├── goals/
        └── reports/
```

As rotas Angular usam lazy loading e ficam em `frontend/src/app/app.routes.ts`.

## API

| Endpoint | Descricao |
|---|---|
| `POST /api/auth/login/` | Login e obtencao de token. |
| `/api/categories/` | CRUD de categorias. |
| `/api/categories/tree/` | Categorias raiz com filhos aninhados. |
| `/api/categories/flat/` | Lista plana de categorias com caminho completo. |
| `/api/third-parties/` | CRUD de terceiros. |
| `/api/payment-types/` | CRUD de tipos de pagamento. |
| `/api/expenses/` | CRUD de despesas e filtros por mes, categoria, terceiro, tipo, cartao, parcela, recorrencia e contracheque. |
| `/api/expenses/{id}/delete-installments/` | Exclusao de parcelas de um grupo. |
| `/api/expenses/{id}/mark-paid/` | Marca boleto como pago, com ajuste opcional de valor. |
| `/api/expenses/boleto-alerts/` | Alertas de boletos pendentes. |
| `/api/incomes/` | CRUD de receitas e filtros por mes, categoria, terceiro e recorrencia. |
| `/api/incomes/categories/` | CRUD de categorias de receita. |
| `/api/financial-calendar/payment-dates/` | CRUD de datas de pagamento. |
| `/api/financial-calendar/payment-dates/by_year/` | Datas de pagamento de um ano. |
| `/api/financial-calendar/payment-dates/bulk-update/` | Atualizacao em lote das datas de pagamento. |
| `/api/financial-calendar/credit-cards/` | CRUD de cartoes de credito. |
| `/api/financial-calendar/financial-months/` | Meses financeiros calculados para um ano. |
| `/api/financial-calendar/current-month/` | Mes financeiro corrente. |
| `/api/salary/config/` | CRUD da configuracao salarial. |
| `/api/salary/config/current/` | Configuracao salarial atual, criando uma padrao se necessario. |
| `/api/salary/calculate/` | Calculo avulso do contracheque. |
| `/api/salary/generate_snapshot/` | Gera ou atualiza snapshot mensal. |
| `/api/salary/projection/` | Projecao salarial multi-ano. |
| `/api/salary/snapshots/` | Lista e detalhe de snapshots salariais. |
| `/api/goals/` | CRUD de metas. |
| `/api/goals/alerts/` | Metas em alerta ou excedidas. |
| `/api/dashboard/summary/` | Resumo mensal. |
| `/api/dashboard/by-category/` | Despesas por categoria. |
| `/api/dashboard/by-credit-card/` | Despesas por cartao. |
| `/api/dashboard/by-third-party/` | Despesas por terceiro. |
| `/api/dashboard/evolution/` | Evolucao mensal. |
| `/api/dashboard/expense-details/` | Detalhamento de despesas/descontos. |
| `/api/reports/summary/` | Resumo por periodo. |
| `/api/reports/by-category/` | Relatorio por categoria. |
| `/api/reports/expenses-by-category/` | Despesas detalhadas por categoria. |
| `/api/reports/installments/` | Parcelas futuras. |
| `/api/reports/comparison/` | Comparativo mensal. |

## Mes financeiro

O mes financeiro e calculado a partir das datas de pagamento cadastradas pelo usuario.

Regra geral:

```text
Mes financeiro X =
  data de pagamento do mes anterior, inclusive
  ate a vespera da data de pagamento do mes X, inclusive
```

Para compras no cartao de credito, a competencia nao e a data da compra. O sistema identifica a fatura da compra, calcula o vencimento dessa fatura e associa a despesa ao mes financeiro que contem esse vencimento.

Mais detalhes em `docs/regra-mes-financeiro.md`.

## Setup local

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # se o arquivo existir no ambiente
python manage.py migrate
python manage.py runserver 0.0.0.0:8003
```

Variaveis esperadas em desenvolvimento:

```text
SECRET_KEY=
DB_NAME=spendingmap_db
DB_USER=spendingmap_user
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### Frontend

```bash
cd frontend
npm install
npx ng serve --host 0.0.0.0 --port 4201 --proxy-config proxy.conf.json
```

## Deploy

O deploy documentado usa VPS com nginx, gunicorn e systemd.

Fluxo resumido:

```bash
cd /srv/spendingmap
git pull origin develop

cd frontend
npx ng build --configuration=production

cd ../backend
source .venv/bin/activate
set -a && source .env.production && set +a
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py collectstatic --noinput
sudo systemctl restart spendingmap
```

Observacao importante: `config.settings.production` importa `dj_database_url` e WhiteNoise. Se o ambiente de producao for recriado do zero usando apenas `backend/requirements.txt`, essas dependencias precisam estar listadas ou instaladas por outro mecanismo; caso contrario, o Django falhara ao carregar os settings de producao.

## Documentacao relacionada

- `docs/estrutura-backend.md`: guia tecnico do backend.
- `docs/regra-mes-financeiro.md`: regra do mes financeiro e cartoes.
- `docs/iniciar-servidores.md`: instrucoes locais para iniciar os servidores.
- `docs/planejamento-app-despesas-v2.md`: planejamento historico da aplicacao.

## Branches

- `main`: codigo estavel em producao.
- `develop`: integracao continua.
- `feature/*`: novas funcionalidades.
- `fix/*`: correcoes de bugs.
