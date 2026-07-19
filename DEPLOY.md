# Deploy (modo hospedado)

Isto documenta como ligar a própria instância hospedada deste projeto ao
`jvmello-infra` existente. **Nada aqui foi aplicado automaticamente** — são
os trechos prontos para colar lá, para revisar antes de subir em produção.

O modo hospedado reusa a instância de Postgres que já existe em
`jvmello-infra` para o World Cup Analytics (`worldcup-db`, banco
`worldcup`) — só que num schema próprio (`match_ratings`), para nunca
colidir com as tabelas do outro projeto. Não sobe um Postgres novo.

## 1. `docker-compose.yml` do jvmello-infra

Pressupõe o layout lado a lado já usado pelos outros serviços
(`context: ../worldcup-match-ratings`, checkout ao lado de
`jvmello-infra`). Adicione dentro de `services:`:

```yaml
  # World Cup Match Ratings — API+dashboard, schema próprio no mesmo
  # Postgres do World Cup Analytics (match_ratings, não gold/silver/bronze).
  match-ratings-api:
    build:
      context: ../worldcup-match-ratings
      dockerfile: Dockerfile
    restart: unless-stopped
    networks:
      - edge
      - worldcup-data
    environment:
      DATABASE_URL: postgresql://${WORLDCUP_DB_USER}:${WORLDCUP_DB_PASSWORD}@worldcup-db:5432/${WORLDCUP_DB_NAME}
      ALLOWED_ORIGINS: https://ratings.jvmello.dev
    depends_on:
      worldcup-db:
        condition: service_healthy
    # sem "ports:" — só o Caddy acessa, via a rede "edge"

  # Import idempotente da planilha para o Postgres. Não sobe com "up -d"
  # (profile "jobs"); é chamado pelo cron do host, mesmo padrão do
  # worldcup-pipeline:
  #   docker compose run --rm match-ratings-import
  match-ratings-import:
    profiles: ["jobs"]
    build:
      context: ../worldcup-match-ratings
      dockerfile: Dockerfile
    networks:
      - worldcup-data   # só precisa alcançar o worldcup-db, sem saída à internet
    environment:
      DATABASE_URL: postgresql://${WORLDCUP_DB_USER}:${WORLDCUP_DB_PASSWORD}@worldcup-db:5432/${WORLDCUP_DB_NAME}
    volumes:
      # a planilha é o dado de origem; entra só-leitura, atualizada por git pull
      - ../worldcup-match-ratings/Notas_da_Copa_2026.xlsx:/app/Notas_da_Copa_2026.xlsx:ro
    entrypoint: ["python", "scripts/import_xlsx_to_db.py", "Notas_da_Copa_2026.xlsx"]
```

`worldcup-db` já está fechado na rede interna `worldcup-data` (só
`worldcup-web`, `worldcup-pipeline` e `worldcup-backup` a alcançavam antes);
os dois serviços novos entram nessa mesma lista de quem pode falar com ela.

## 2. Caddyfile

```
ratings.jvmello.dev {
    reverse_proxy match-ratings-api:8000
}
```

Crie o registro DNS (proxied, nuvem laranja) para `ratings.jvmello.dev` no
Cloudflare antes de subir — mesmo padrão dos outros subdomínios.

## 3. Cron do host

Mesmo crontab que já roda o `worldcup-sync` (não é um mecanismo de cron
novo, é uma linha a mais nele). Como as notas são preenchidas manualmente
por você, não em tempo real, um intervalo mais espaçado que os 30 min do
pipeline de dados já cobre bem — ajuste como quiser:

```cron
0 * * * * cd $HOME/projects/jvmello-infra && /usr/bin/docker compose run --rm match-ratings-import >> $HOME/projects/jvmello-infra/logs/match-ratings-import.log 2>&1
```

## 4. Primeira subida

```bash
git clone <este-repo> ../worldcup-match-ratings   # ao lado de jvmello-infra
cd jvmello-infra
docker compose up -d --build match-ratings-api
docker compose run --rm match-ratings-import       # popular o banco pela 1ª vez
```

## Por que um schema, não um banco novo

`match_ratings.matches` e `match_ratings.criteria_config` (ver
`src/match_ratings/db/schema.sql`) vivem dentro do banco `worldcup` que já
existe — só num schema separado do `gold`/`silver`/`bronze` do World Cup
Analytics. Isso evita subir outro container de Postgres (outro volume,
outro backup, outra rede) só para ~100 linhas de dados pessoais.
`worldcup-backup` (o `pg_dump` diário já configurado) cobre os dois
projetos automaticamente, sem mudança nenhuma nele.
