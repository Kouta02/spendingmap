# SpendingMap

App pessoal de controle de despesas com **Django + Angular**.

Registra, visualiza e analisa despesas e receitas mensais, com um modulo de remuneracao que calcula automaticamente o contracheque (proventos, descontos, liquido) e exibe o saldo mensal real.

## Stack

- **Backend:** Django 6.0 + Django REST Framework 3.16 + PostgreSQL
- **Frontend:** Angular + Angular Material
- **Deploy:** Railway (backend) + Vercel (frontend)

## Estrutura do Projeto

```
spendingmap/
├── backend/
│   ├── config/          # Settings (base/dev/prod), URLs, WSGI
│   ├── apps/
│   │   ├── categories/  # CRUD de categorias
│   │   ├── banks/       # CRUD de bancos
│   │   └── expenses/    # CRUD de despesas + filtros + parcelas
│   ├── manage.py
│   └── requirements.txt
├── frontend/            # App Angular (em breve)
├── docs/                # Documentacao e arquivos de referencia
└── README.md
```

## API Endpoints

| Endpoint | Metodos | Descricao |
|---|---|---|
| `/api/auth/login/` | POST | Obter token de autenticacao |
| `/api/categories/` | GET, POST | Listar / criar categorias |
| `/api/categories/{id}/` | GET, PUT, PATCH, DELETE | Detalhe / editar / excluir |
| `/api/banks/` | GET, POST | Listar / criar bancos |
| `/api/banks/{id}/` | GET, PUT, PATCH, DELETE | Detalhe / editar / excluir |
| `/api/expenses/` | GET, POST | Listar / criar despesas |
| `/api/expenses/{id}/` | GET, PUT, PATCH, DELETE | Detalhe / editar / excluir |

**Filtros de despesas:** `?month=YYYY-MM`, `?category=`, `?bank=`, `?payment_type=`, `?is_installment=`, `?from_paycheck=`

## Setup Local

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # configurar credenciais
python manage.py migrate
python manage.py runserver 0.0.0.0:8002
```

## Branches

- `main` — codigo estavel
- `develop` — integracao continua
- `feature/*` — funcionalidades em desenvolvimento
