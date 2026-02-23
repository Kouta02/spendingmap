# SpendingMap

App pessoal de controle de despesas com **Django + Angular**.

Registra, visualiza e analisa despesas e receitas mensais, com um modulo de remuneracao que calcula automaticamente o contracheque (proventos, descontos, liquido) e exibe o saldo mensal real.

## Stack

- **Backend:** Django + Django REST Framework + PostgreSQL
- **Frontend:** Angular + Angular Material
- **Deploy:** Railway (backend) + Vercel (frontend)

## Estrutura do Projeto

```
spendingmap/
├── backend/          # API Django + DRF
├── frontend/         # App Angular
├── docs/             # Documentacao e arquivos de referencia
│   ├── planejamento-app-despesas-v2.md
│   ├── index.html                      # Simulador salarial (referencia)
│   └── despesas_mensais_exemplo.xlsx   # Planilha modelo
├── .gitignore
└── README.md
```

## Branches

- `main` — codigo estavel
- `develop` — integracao continua
- `feature/*` — funcionalidades em desenvolvimento
