# Fase 1 (Backend) — Django + Models + CRUD API

**Data:** 23/02/2026
**Sessao:** Implementacao completa do backend da Fase 1
**Branch:** `feature/phase1-backend` (mergeada em `develop`)

---

## Resumo

Configuracao completa do backend Django com DRF, incluindo models, CRUD API REST, autenticacao por token e conexao com PostgreSQL. O frontend Angular ficou para a proxima sessao.

---

## 1. Branch de Feature

- Criada branch `feature/phase1-backend` a partir de `develop`
- Ao final, mergeada de volta em `develop` via fast-forward

---

## 2. PostgreSQL — Database e Usuario

Criados diretamente no PostgreSQL do VPS:

| Item | Valor |
|---|---|
| Database | `spendingmap_db` |
| Usuario | `spendingmap_user` |
| Encoding | UTF8 |

Credenciais salvas em `backend/.env` (arquivo no `.gitignore`, nao versionado).

---

## 3. Ambiente Virtual e Dependencias

Criado virtualenv em `backend/.venv` (em vez de instalacao global com `--break-system-packages`).

**Pacotes instalados:**

| Pacote | Versao | Funcao |
|---|---|---|
| Django | 6.0.2 | Framework web |
| djangorestframework | 3.16.1 | API REST |
| django-cors-headers | 4.9.0 | CORS para Angular |
| django-filter | 25.2 | Filtros na API |
| psycopg2-binary | 2.9.11 | Driver PostgreSQL |
| python-decouple | 3.8 | Variaveis de ambiente (.env) |
| python-dateutil | 2.9.0 | Calculo de datas (parcelas mensais) |

Arquivo `backend/requirements.txt` gerado com `pip freeze`.

---

## 4. Projeto Django — Estrutura de Settings

O projeto foi criado com `django-admin startproject config backend/` e os settings foram reorganizados em 3 arquivos:

### `config/settings/base.py`
- `SECRET_KEY` via `python-decouple`
- `TIME_ZONE = 'America/Sao_Paulo'`, `USE_TZ = True`
- `LANGUAGE_CODE = 'pt-br'`
- INSTALLED_APPS: `rest_framework`, `rest_framework.authtoken`, `corsheaders`, `django_filters` + apps locais
- MIDDLEWARE com `CorsMiddleware` posicionado antes do `SessionMiddleware`
- REST_FRAMEWORK: paginacao (50/pagina), DjangoFilterBackend, OrderingFilter
- `DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'`

### `config/settings/development.py`
- `DEBUG = True`, `ALLOWED_HOSTS = ['*']`
- Database PostgreSQL local via `.env`
- `CORS_ALLOW_ALL_ORIGINS = True`
- Autenticacao: TokenAuthentication + SessionAuthentication
- Permissao: `AllowAny` (sem bloqueio durante desenvolvimento)

### `config/settings/production.py`
- `DEBUG = False`
- `ALLOWED_HOSTS` via variavel de ambiente
- `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`
- `STATIC_ROOT` configurado
- Autenticacao: TokenAuthentication obrigatoria
- Permissao: `IsAuthenticated`

### Outros ajustes
- `manage.py`, `wsgi.py`, `asgi.py` apontam para `config.settings.development`
- Diretorio `backend/apps/` criado como pacote Python (`__init__.py`)
- Arquivo `backend/.env` com SECRET_KEY, credenciais do banco

---

## 5. Models

Tres apps criados em `backend/apps/`:

### Category (`apps/categories/models.py`)
| Campo | Tipo | Observacao |
|---|---|---|
| `id` | UUIDField | PK, auto-gerado |
| `name` | CharField(100) | Nome da categoria |
| `icon` | CharField(50) | Icone (opcional) |
| `color` | CharField(20) | Cor hex (opcional) |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

### Bank (`apps/banks/models.py`)
| Campo | Tipo | Observacao |
|---|---|---|
| `id` | UUIDField | PK, auto-gerado |
| `name` | CharField(100) | Nome do banco |
| `color` | CharField(20) | Cor hex (opcional) |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

### Expense (`apps/expenses/models.py`)
| Campo | Tipo | Observacao |
|---|---|---|
| `id` | UUIDField | PK, auto-gerado |
| `description` | CharField(255) | Descricao da despesa |
| `amount` | DecimalField(12,2) | Valor em reais |
| `date` | DateField | Data da despesa |
| `category` | FK → Category | SET_NULL, opcional |
| `payment_type` | CharField choices | CREDIT, DEBIT, BOLETO, PIX |
| `bank` | FK → Bank | SET_NULL, opcional |
| `is_installment` | BooleanField | Se e parcelada |
| `installment_current` | PositiveIntegerField | Parcela atual (null) |
| `installment_total` | PositiveIntegerField | Total de parcelas (null) |
| `installment_group_id` | UUIDField | Agrupa parcelas (indexado) |
| `is_recurring` | BooleanField | Se e recorrente |
| `from_paycheck` | BooleanField | Se vem do contracheque |
| `notes` | TextField | Observacoes (opcional) |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

Todos os models registrados no Django Admin com `list_display`, `list_filter`, `search_fields` e `date_hierarchy` (expenses).

---

## 6. Migrations

Migrations geradas e aplicadas com sucesso para as 3 apps + tabelas padrao do Django (auth, admin, sessions, contenttypes, authtoken).

Tabelas criadas no PostgreSQL:
- `categories_category`
- `banks_bank`
- `expenses_expense`

---

## 7. API REST — Serializers, Views e URLs

### Categories e Banks
- `ModelSerializer` simples com todos os campos
- `ModelViewSet` com CRUD completo
- `search_fields = ['name']`
- Rotas: `/api/categories/` e `/api/banks/`

### Expenses
**Serializer (`ExpenseSerializer`):**
- Campos read-only: `category_name`, `bank_name` (resolve o nome via FK)
- Validacao: despesa parcelada exige `installment_total >= 2`
- Criacao de parcelas: ao receber `is_installment=True` + `installment_total`, gera N registros via `bulk_create` com:
  - `installment_group_id` compartilhado (UUID unico por grupo)
  - `installment_current` de 1 a N
  - `date` incrementada mensalmente via `relativedelta`

**Filter (`ExpenseFilter`):**
- Filtro customizado `month` (formato `YYYY-MM`) — filtra por `date__year` + `date__month`
- Filtros padrao: `category`, `bank`, `payment_type`, `is_installment`, `is_recurring`, `from_paycheck`

**ViewSet (`ExpenseViewSet`):**
- `select_related('category', 'bank')` para otimizar queries
- `ordering_fields`: date, amount, created_at
- `ordering` padrao: `-date`, `-created_at`

### URLs (`config/urls.py`)
```
/admin/                          → Django Admin
/api/auth/login/                 → POST — obter token (obtain_auth_token)
/api/categories/                 → GET, POST
/api/categories/{id}/            → GET, PUT, PATCH, DELETE
/api/banks/                      → GET, POST
/api/banks/{id}/                 → GET, PUT, PATCH, DELETE
/api/expenses/                   → GET, POST
/api/expenses/{id}/              → GET, PUT, PATCH, DELETE
```

---

## 8. Autenticacao

- `rest_framework.authtoken` adicionado aos INSTALLED_APPS
- Endpoint `POST /api/auth/login/` usando `obtain_auth_token` do DRF
- Em desenvolvimento: TokenAuth + SessionAuth disponiveis, mas permissao AllowAny
- Em producao: TokenAuth obrigatorio + IsAuthenticated
- Superuser criado: `admin` / `admin123456` (apenas para dev local)

---

## 9. Testes Realizados

Bateria de testes manuais via curl, todos passaram:

| Teste | Resultado |
|---|---|
| POST /api/categories/ (criar) | OK — retorna UUID, timestamps em America/Sao_Paulo |
| GET /api/categories/{id}/ (detalhe) | OK |
| PATCH /api/categories/{id}/ (editar) | OK — campo `updated_at` atualizado |
| POST /api/banks/ (criar) | OK |
| POST /api/expenses/ (despesa simples) | OK — com `category_name` e `bank_name` |
| POST /api/expenses/ (parcelada 3x) | OK — 3 registros gerados com group_id |
| GET /api/expenses/?month=2026-02 | OK — 2 despesas (almoco + parcela 1) |
| GET /api/expenses/?month=2026-03 | OK — 1 despesa (parcela 2) |
| GET /api/expenses/?month=2026-04 | OK — 1 despesa (parcela 3) |
| DELETE /api/expenses/{id}/ | OK — HTTP 204 |
| DELETE /api/categories/{id}/ | OK — HTTP 204 |
| DELETE /api/banks/{id}/ | OK — HTTP 204 |
| POST /api/auth/login/ (obter token) | OK — retorna `{"token": "..."}` |
| GET com header Authorization: Token | OK — autenticacao funcional |

---

## 10. Commits

Tres commits incrementais na branch `feature/phase1-backend`:

```
d631632 feat(backend): setup Django project with DRF, PostgreSQL and split settings
d593a13 feat(backend): add Category, Bank and Expense models with migrations
0efb9f4 feat(backend): add CRUD API for categories, banks and expenses
```

Merge em `develop` (fast-forward) + commit de atualizacao do README:
```
771cd25 docs: update README with API endpoints and setup instructions
```

Branch pushada para o remote e `develop` atualizada.

---

## 11. Observacoes

- **Porta de desenvolvimento:** 8002 (portas 8000 e 8001 ocupadas pelo projeto senado_nusp no mesmo VPS)
- **Nenhuma alteracao** foi feita no projeto senado_nusp — confirmado que gunicorn continua rodando normalmente
- O `CLAUDE.md` foi atualizado com: status da Fase 1, instrucoes do venv, porta de dev, credenciais do banco, estrutura real do repo
- O `README.md` foi atualizado com: tabela de endpoints, instrucoes de setup, versoes

---

## Proximo Passo

**Fase 1 (frontend):** Setup do Angular + Angular Material, tela de listagem de despesas por mes, formulario de cadastro de despesas.

Ou, alternativamente, pular para a **Fase 2** (modulo de remuneracao) se for prioridade.
