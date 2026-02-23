# Setup Inicial do Projeto SpendingMap

**Data:** 23/02/2026
**Sessao:** Configuracao do ambiente de desenvolvimento e inicializacao do repositorio

---

## 1. Integracao MCP Server — Hostinger

A configuracao do MCP server da Hostinger ja existia em `/root/.claude.json` para os projetos `/var/www` e `/root`. Como o projeto atual roda em `/srv/spendingmap`, foi necessario adicionar a mesma configuracao de MCP para este path.

**Acao:** Usando `jq`, adicionamos a entrada `"/srv/spendingmap"` na secao `projects` do arquivo `/root/.claude.json`, replicando o bloco `mcpServers` com o comando `hostinger-api-mcp` e o token de API.

**Validacao:** Apos reiniciar a sessao do Claude Code, listamos os dominios da conta Hostinger com sucesso:

| Dominio | Tipo | Expira em |
|---|---|---|
| senado-nusp.cloud | free_domain | — |
| senado-nusp.cloud | domain | 27/10/2026 |
| spendingmap.com.br | domain | 26/01/2029 |

---

## 2. Configuracao de Multiplas Contas GitHub via SSH

O objetivo era manter duas contas GitHub no mesmo servidor Linux (VPS Hostinger): uma profissional (ja configurada) e uma pessoal.

### 2.1 Verificacao inicial

- Chave existente: `~/.ssh/id_ed25519` (conta profissional)
- Arquivo `~/.ssh/config`: nao existia

### 2.2 Geracao de nova chave SSH

```bash
ssh-keygen -t ed25519 -C "doug.2531@gmail.com" -f ~/.ssh/id_github_pessoal -N ""
```

- **Tipo:** ed25519
- **Arquivo:** `~/.ssh/id_github_pessoal`
- **E-mail:** doug.2531@gmail.com

### 2.3 Adicao ao ssh-agent

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_github_pessoal
```

### 2.4 Cadastro da chave no GitHub

A chave publica (`~/.ssh/id_github_pessoal.pub`) foi cadastrada manualmente no GitHub pessoal:
- **GitHub:** Settings > SSH and GPG keys > New SSH key
- **Titulo:** VPS Hostinger

### 2.5 Configuracao do ~/.ssh/config

Arquivo criado com dois blocos — um para cada conta:

```
# Conta profissional (padrao)
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

# Conta pessoal
Host github-pessoal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_github_pessoal
    IdentitiesOnly yes
```

Permissoes: `chmod 600 ~/.ssh/config`

### 2.6 Teste de conexao

```bash
ssh -T git@github-pessoal
# Hi Kouta02! You've successfully authenticated, but GitHub does not provide shell access.
```

Conta pessoal autenticada com sucesso como **Kouta02**.

### 2.7 Como usar no dia a dia

| Operacao | Comando |
|---|---|
| Clonar repo pessoal | `git clone git@github-pessoal:Kouta02/repo.git` |
| Adicionar remote pessoal | `git remote add origin git@github-pessoal:Kouta02/repo.git` |
| Config local por projeto | `git config user.name "Kouta02"` / `git config user.email "doug.2531@gmail.com"` |

---

## 3. Inicializacao do Repositorio SpendingMap

### 3.1 Criacao do repositorio remoto

- **Plataforma:** GitHub (conta pessoal Kouta02)
- **Nome:** spendingmap
- **Visibilidade:** Privado
- **Inicializacao:** Vazio (sem README, .gitignore ou licenca)
- **URL:** `git@github-pessoal:Kouta02/spendingmap.git`

### 3.2 Estrutura de pastas criada

```
/srv/spendingmap/
├── backend/          # API Django + DRF (vazio, com .gitkeep)
├── frontend/         # App Angular (vazio, com .gitkeep)
├── docs/             # Documentacao e referencias
│   ├── planejamento-app-despesas-v2.md
│   ├── index.html                      # Simulador salarial
│   └── despesas_mensais_exemplo.xlsx   # Planilha modelo
├── .gitignore
└── README.md
```

### 3.3 Arquivos movidos para docs/

Os tres arquivos de referencia que estavam na raiz foram movidos para `docs/`:
- `planejamento-app-despesas-v2.md` — planejamento completo do app
- `index.html` — simulador salarial React (referencia das formulas)
- `despesas_mensais_exemplo.xlsx` — planilha com estrutura de dados atual

### 3.4 README.md

Criado na raiz com nome do projeto, descricao, stack (Django + Angular + PostgreSQL), estrutura de pastas e estrategia de branches.

### 3.5 .gitignore

Configurado para cobrir:
- **Python/Django:** `__pycache__/`, `*.pyc`, `db.sqlite3`, `.env`, `venv/`
- **Node/Angular:** `node_modules/`, `frontend/dist/`, `.angular/`
- **IDE:** `.vscode/` (exceto settings e extensions), `.idea/`
- **OS:** `.DS_Store`, `Thumbs.db`
- **Testes:** `htmlcov/`, `.coverage`, `.pytest_cache/`, `coverage/`

### 3.6 Inicializacao do Git

```bash
git init -b main
git config user.name "Douglas Antunes dos Santos"
git config user.email "doug.2531@gmail.com"
git remote add origin git@github-pessoal:Kouta02/spendingmap.git
```

### 3.7 Commit inicial e push

```
34e649e Initial commit: project structure and reference docs
```

Arquivos commitados: `.gitignore`, `README.md`, `backend/.gitkeep`, `frontend/.gitkeep`, `docs/` (3 arquivos).

### 3.8 Estrategia de branches

| Branch | Finalidade |
|---|---|
| `main` | Codigo estavel, pronto para deploy |
| `develop` | Integracao continua, base para features |
| `feature/*` | Branches de funcionalidade (ex: `feature/expense-crud`) |

Branch `develop` criada e enviada ao remoto. Branch atual: `develop`.

---

## Resumo de Configuracoes Ativas

| Item | Valor |
|---|---|
| **SSH pessoal** | `~/.ssh/id_github_pessoal` / Host: `github-pessoal` |
| **GitHub user** | Kouta02 |
| **Git user (local)** | Douglas Antunes dos Santos / doug.2531@gmail.com |
| **Remote** | `git@github-pessoal:Kouta02/spendingmap.git` |
| **Branch atual** | `develop` |
| **MCP Hostinger** | Ativo para `/srv/spendingmap` |
| **Dominios Hostinger** | senado-nusp.cloud, spendingmap.com.br |

---

## Proximo Passo

**Fase 1 — Base de Despesas:** Setup do projeto Django + DRF, criacao dos models Expense, Category e Bank, CRUD completo via API.
