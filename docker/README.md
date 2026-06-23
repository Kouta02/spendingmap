# Deploy com Docker (máquina Arch)

Produção do SpendingMap em Docker no Arch (front + back + banco), no mesmo padrão do
projeto SOAP. TLS/HTTPS é terminado fora, na borda do **Cloudflare Tunnel**.

## Pré-requisitos
- Docker + Docker Compose v2

## Configuração
`docker/.env` é o template **local** (gitignorado). Edite-o com os valores reais antes de subir:
gerar `SECRET_KEY`, definir `*_PASSWORD` do banco e copiar `TELEGRAM_*` do `backend/.env`.
(`.env.example` é só referência.)

## Containers
| Container | Serviço | Porta |
|---|---|---|
| spendingmap-db | PostgreSQL 18 | interna (sem porta no host) |
| spendingmap-api | Django + gunicorn | 8000 (interna) |
| spendingmap-web | Angular + Nginx | 8085 (host) → 80 |
| spendingmap-cloudflared | Cloudflare Tunnel | — (rede interna → frontend:80) |

## Primeira subida (cutover) — ⚠️ A ORDEM IMPORTA
**NÃO** rode `docker compose up -d` direto na primeira vez: o backend roda `migrate` e
criaria schema + dados iniciais no banco **vazio**, colidindo com a restauração do dump
(resultado: banco inconsistente, perda silenciosa de dados). Ordem correta:

```bash
cd docker/

# 1) Só o banco
sudo docker compose up -d db

# 2) Esperar ficar healthy
until [ "$(sudo docker inspect -f '{{.State.Health.Status}}' spendingmap-db)" = healthy ]; do sleep 2; done

# 3) Dump fresco do banco-fonte (Postgres do host) e restauração SEGURA no container.
#    --set ON_ERROR_STOP=on + -1 (transação): aborta e avisa se algo falhar.
#    (psql, por padrão, IGNORA erros e sai com código 0 → mascararia uma restauração parcial.)
PGPASSWORD=<senha-do-host> pg_dump -U spendingmap_user -h localhost spendingmap_db > /tmp/sm.sql
sudo docker exec -i spendingmap-db psql -U spendingmap_user -d spendingmap_db \
  --set ON_ERROR_STOP=on -1 < /tmp/sm.sql
echo "exit: $?"   # tem que ser 0

# 4) Conferir contagem (deve bater com a fonte; ex.: expenses_expense)
sudo docker exec spendingmap-db psql -U spendingmap_user -d spendingmap_db -tAc \
  "SELECT count(*) FROM expenses_expense;"

# 5) Agora sim o resto. O migrate do entrypoint vira no-op (django_migrations veio do dump)
#    e aplica apenas migrations realmente novas.
sudo docker compose up -d backend frontend
```

## Atualizar após mudanças no código (banco já populado)
```bash
cd docker/
sudo docker compose build && sudo docker compose up -d
```

## Parar
```bash
sudo docker compose down      # mantém os dados (volume)
sudo docker compose down -v   # ⚠️ apaga o banco (volume)
```

## Acessar
- Local/Tailscale: http://lenovo-arch.tail5e48ac.ts.net:8085
- Produção: https://spendingmap.com.br
