# World Cup Match Ratings

*[Read this in English](README.md)*

Notas pessoais e subjetivas para cada partida da Copa do Mundo 2026 — um
quesito de 5 critérios, com pesos configuráveis, virando uma "nota final"
por partida. É um projeto separado do `world-cup-analytics` (que é dados
objetivos via API); este aqui é opinativo, e o objetivo principal é
**reprodutibilidade**: qualquer pessoa consegue clonar e rodar na própria
máquina, sem depender de infra nenhuma, e fazer a mesma coisa com as
próprias notas.

## A fonte da verdade é a planilha

[`Notas_da_Copa_2026.xlsx`](Notas_da_Copa_2026.xlsx) tem uma aba por fase
do torneio (Fase de grupos, 16 avos, Oitavas, Quartas, Semifinais, 3º
lugar, Final) mais duas abas de configuração:

- **Quesitos**: os 5 critérios avaliados em cada partida, de 0 a 10, e o
  peso de cada um na nota final — editável, tudo recalcula sozinho:

  | Quesito | Peso |
  |---|---|
  | 1º tempo | 2.5 |
  | 2º tempo | 2.5 |
  | Lá e cá (alternância, ataques dos dois lados, ritmo) | 2.0 |
  | Emoção (tensão, viradas, gols tardios, drama) | 2.0 |
  | Componente histórico (zebras, recordes, rivalidade) | 1.0 |

  Nota final = média ponderada dos 5 quesitos pelos pesos acima,
  arredondada a 2 casas — fórmula de cada partida em `K3` de cada aba de
  fase. A mesma aba também tem a legenda de cores (0–1,99 roxo, 2–4,99
  vermelho, 5–6,99 âmbar, 7–8,99 azul, 9–10 verde) usada nas duas
  ferramentas deste repositório.

- **Resumo**: agregados gerais (total de partidas, média geral, maior e
  menor nota) via fórmulas que leem as outras abas.

Este repositório **nunca recalcula a nota final** — ele lê o valor que a
própria planilha já calculou. A planilha manda; o código só lê, agrega e
exibe.

## Faça a sua

Modelos em branco (mesmo calendário de jogos e placares, quesitos e pesos
padrão, só as 5 notas em branco para você preencher):

- [`templates_blank/Notas_da_Copa_2026_modelo_PT.xlsx`](templates_blank/Notas_da_Copa_2026_modelo_PT.xlsx)
- [`templates_blank/World_Cup_2026_match_ratings_template_EN.xlsx`](templates_blank/World_Cup_2026_match_ratings_template_EN.xlsx)

Regenere-os a partir da planilha preenchida com
`python scripts/generate_blank_templates.py`.

## Modo local — "tente você também"

Sem Docker, sem banco de dados: lê o `.xlsx` direto do disco e sobe um
dashboard no navegador.

```bash
git clone <este-repo> && cd worldcup-match-ratings
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python run.py Notas_da_Copa_2026.xlsx
```

Abre sozinho em `http://127.0.0.1:8420`. Edite a planilha e dê refresh no
navegador — os dados são relidos automaticamente (sem precisar reiniciar).
Para usar a sua própria: `.venv/bin/python run.py caminho/para/sua-planilha.xlsx`.

Este é o modo recomendado para quem só quer testar com a própria planilha.
O dashboard tem um botão **EN/PT** no canto superior direito — a planilha
continua em português por baixo, mas a interface (times, fases, quesitos,
textos) é traduzida na hora, sem recarregar a página.

> **Debian/Ubuntu:** se `python3 -m venv .venv` falhar com "ensurepip is not
> available", falta o pacote de venv da sua versão do sistema —
> `sudo apt install python3.10-venv` (ajuste a versão) resolve.

## Modo hospedado

Mesmo código de agregação, mas os dados ficam persistidos em Postgres
(schema `match_ratings`) e a API/dashboard leem de lá em vez do `.xlsx`
diretamente — pensado para a minha própria instância publicada, reusando a
infraestrutura já existente. Ver [`DEPLOY.md`](DEPLOY.md) para como isso se
liga ao `jvmello-infra`, e `scripts/import_xlsx_to_db.py` para o import
idempotente planilha → Postgres.

## Estrutura

```
src/match_ratings/
  models.py       # Match, CriteriaWeight, ColorBand — estruturas puras
  xlsx_loader.py  # planilha -> models (pesos, faixas de cor e notas são lidos, nunca recalculados)
  aggregate.py    # resumo, top notas, por time, por quesito — mesma lógica local e hospedado
  data_source.py  # a única costura entre "de onde vêm os dados" (xlsx local ou Postgres) e o resto
  api.py          # FastAPI compartilhada pelos dois modos
  db/             # schema, loader e importer do modo hospedado
webapp/           # dashboard estático (HTML/CSS/JS puro, sem build step)
  i18n.js         # tradução PT/EN da interface (times, fases, quesitos, textos), só de exibição
run.py            # entrypoint do modo local
hosted.py         # entrypoint do modo hospedado
tests/            # valida o loader e as agregações contra a planilha real
```

## Rodando os testes

```bash
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest
```

---

Mais projetos em [jvmello.dev](https://jvmello.dev).
