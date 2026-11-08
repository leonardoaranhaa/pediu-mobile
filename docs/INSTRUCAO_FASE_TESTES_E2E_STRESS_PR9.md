# Instrução técnica — Testes E2E estressantes de todo o projeto

**Fase:** validação vertical completa do Pediu Mobile
**Branch:** `cursor/phase1-hybrid-ux-a9df`
**Objetivo:** exercitar os fluxos cliente, lojista, entregador, pagamentos, segurança, dados, migrations, bundle e deployment sob carga controlada, sem mascarar falhas com fixtures incompletas.

## Princípios

1. **Backend e banco reais:** executar os smokes contra a API ativa e MySQL configurado em `/tmp/pr7-phase29.env`; não substituir persistência por mocks nos caminhos E2E.
2. **Fonte de verdade:** reutilizar os scripts `go-live:*` já versionados e a ordem do workflow `Pediu Operational Validation`.
3. **Isolamento:** executar os smokes mutáveis em sequência quando compartilharem fixtures, respeitar seus cleanups e não apagar dados fora dos prefixos criados pelos próprios scripts.
4. **Carga controlada:** rodar stress read-only local e HTTPS com 120 requisições e concorrência 12, registrando p50/p95/máximo/erro; não gerar uma carga destrutiva no ambiente de validação.
5. **E2E do cliente:** validar API, transporte tRPC, bundle Expo Web, rotas visuais, dock, assistente, mascote, cliente, lojista e entregador. Login OAuth real permanece dependência externa quando o smoke exigir credenciais de usuário.
6. **Critério de avanço:** corrigir qualquer falha antes de publicar ou declarar a fase verde.

## Matriz de execução

### 1. Gates estáticos e artefatos

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Prettier dos arquivos alterados e `git diff --check`
- Export Expo Web; builds nativas Android/iOS permanecem condicionadas ao EAS e a dispositivos reais.
- Verificação do tamanho do bundle web e ausência de referências quebradas

### 2. Banco/API/deployment

- Aplicar migrations no banco de validação e verificar readiness.
- `go-live:check`
- `go-live:deployment` local e HTTPS
- Health, readyz, CORS, marketplace e métricas quando configuradas.

### 3. E2E funcional do cliente

- `go-live:e2e`
- `go-live:flash-loyalty`
- `go-live:reviews`
- `go-live:serviceability`
- `go-live:pagination`
- `go-live:inventory`
- `go-live:inventory-expiry`
- `go-live:notification-outbox`

### 4. E2E operacional de lojista/entregador

- `go-live:operations-e2e`
- `go-live:dispatch-reoffer`
- `go-live:tracking-resilience`
- `go-live:device-preflight`
- `go-live:fiado-concurrency`

### 5. Pagamentos, segurança e limites

- `go-live:finance`
- `go-live:concurrency`
- `go-live:rate-limit`
- `go-live:cors-security`
- `go-live:storage-security`
- `go-live:limits-security`
- `go-live:backup-restore`

### 6. Stress

- Read-only local: 120 requests / concurrency 12.
- Read-only HTTPS do sandbox: 120 requests / concurrency 12.
- Repetir após o deployment smoke e comparar p95 sem confundir warm-up com melhoria.

### 7. Preview visual

- Home, busca, Flash, Mercado, Sabor, Club, cliente, lojista e entregador.
- Verificar console sem erros, overflow horizontal falso, acessibilidade básica e handlers principais.
- No fluxo cliente, confirmar que o item Assistente aparece uma vez no dock e abre o modal real.

## Evidências obrigatórias

Para cada etapa registrar comando, resultado, status HTTP/erro, duração e cleanup. Uma etapa somente é verde se suas asserções passarem e o processo sair com código 0. Warnings de ambiente devem ser separados de falhas funcionais.

## Evidências executadas em 2026-10-07/08

A matriz foi executada contra MySQL real e uma API isolada na porta 3149, com o mock Mercado Pago na porta 3100. Os 21 scripts do workflow (`go-live:check`, backup/restore, cliente, Flash/Club, lojista/entregador, inventory, outbox, tracking, segurança, pagamentos e concorrência) terminaram **21/21 PASS após os ajustes de ambiente**. Na primeira passagem houve três bloqueios de infraestrutura, todos reproduzidos e corrigidos sem alteração de código de produto: o backup precisava de `BACKUP_RESTORE_ADMIN_DATABASE_URL` com privilégio temporário de criação do banco de restore; o preflight precisava de `EXPO_PUBLIC_API_BASE_URL` apontando para uma URL HTTPS pública; e a API isolada precisava receber `MERCADO_PAGO_NOTIFICATION_URL`. O administrador temporário e o banco de restore foram removidos ao final.

O backup/restore final confirmou **48 tabelas, 36 migrations e 7 verificações de contagem de registros**. A API respondeu `health=200` e `readyz=200`, com checks de banco, migrations e tabelas aprovados. O deployment smoke passou localmente e pela URL HTTPS pública, validando health, readyz, marketplace, CORS exato e métricas protegidas.

O stress read-only executou 120 requisições com concorrência 12 em cada alvo, sem erros: preview local `p50=34,4 ms`, `p95=82,3 ms`, máximo `125,8 ms`; preview HTTPS `p50=34,1 ms`, `p95=161,5 ms`, máximo `323,7 ms`; produção local `p50=28,3 ms`, `p95=59,7 ms`, máximo `117,4 ms`; produção HTTPS `p50=36,8 ms`, `p95=112,7 ms`, máximo `195,7 ms`.

Os gates de código passaram com `pnpm check`, **48 arquivos/239 testes**, `pnpm build`, `pnpm lint`, Prettier e `git diff --check`. O export Expo Web gerou 62 rotas, 115 arquivos e aproximadamente 19,6 MB de artefatos, com bundle JavaScript web de 3,51 MB. No preview, a home confirmou um item Assistente no dock e um mascote separado; o modal do Assistente abriu pelo dock; o viewport não apresentou overflow (`scrollWidth=clientWidth=1280`); e o console permaneceu sem erros visíveis. Flash, Mercado, Sabor, Club, lojista e entregador renderizaram; sem sessão, lojista e entregador mostraram corretamente o guard de login seguro.

## Limitações explícitas

- Não declarar homologação PSP/PIX, OAuth real ou release EAS como concluídos sem credenciais e dispositivos externos.
- Não usar carga destrutiva ou loops infinitos contra o banco real.
- Não alterar migrations, contratos ou código de produção apenas para fazer o smoke passar; qualquer correção deve ter teste/regressão e nova rodada completa.
