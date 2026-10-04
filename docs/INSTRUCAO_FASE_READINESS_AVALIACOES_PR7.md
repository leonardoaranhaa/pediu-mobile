# Instrução técnica — readiness operacional e integridade de avaliações no PR #7

## Objetivo

Fechar duas lacunas P0 executáveis sem declarar o Go-Live comercial READY:

1. separar liveness de readiness dependente do banco, migrations e tabelas críticas;
2. garantir que avaliações pós-entrega só sejam gravadas pelo cliente elegível, para alvos pertencentes ao pedido, com courier atribuído e replay idempotente.

A fase foi executada sobre a branch `docs/go-live-plan`, usando o PR #7 como fonte da verdade. Nenhum PSP real, CNPJ, credencial externa ou dispositivo físico foi simulado.

## Implementação

- `server/_core/readiness.ts` implementa o probe bounded de readiness:
  - consulta `SELECT 1` no banco;
  - confere o tracker de migrations;
  - confere as tabelas críticas do runtime;
  - retorna payload sanitizado e `503` quando qualquer dependência essencial falha.
- `server/_core/index.ts` expõe `GET /api/readyz`, separado de `GET /api/health`.
- `scripts/go-live-deployment.ts` e `scripts/go-live-readiness.ts` passaram a exigir/consultar readiness HTTP real.
- O workflow operacional usa readiness também nos boots da API, sem mascarar banco indisponível como catálogo vazio.
- `server/experience-router.ts` e `app/feedback/[orderId].tsx` mantêm o contrato de review pós-entrega:
  - somente o cliente dono do pedido;
  - pedido com status `Entregue`;
  - alvo `store`, `product` ou `courier` conforme elegibilidade;
  - produto pertencente aos itens do pedido;
  - courier atribuído à entrega;
  - chave de idempotência estável, com replay igual retornando a review existente e replay conflitante rejeitado.
- `scripts/go-live-reviews.ts` foi adicionado ao package e ao `Pediu Operational Validation` para exercitar o contrato no bundle compilado contra MariaDB real.

## Evidências

### Baseline anterior à alteração

- Deployment smoke no bundle financeiro: health, marketplace, CORS e métricas protegidas aprovados.
- Stress read-only: 120 requests, 12 workers, `p50=17,6 ms`, `p95=32,1 ms`, máximo `67,4 ms`, erro `0%`.

### Validação pós-alteração

- `GET /api/health`: HTTP `200`.
- `GET /api/readyz`: HTTP `200`, payload com `database`, `migrations` e `tables` em `pass`.
- Deployment smoke real: health `200`, readyz `200`, marketplace `200`, CORS exato e métricas protegidas.
- Stress read-only: 120 requests, 12 workers, `p50=18,4 ms`, `p95=63,4 ms`, máximo `69,6 ms`, erro `0%`.
- Smoke E2E real `pnpm go-live:reviews`: aprovado contra MariaDB real, cobrindo listagem de produtos elegíveis, review de loja, produto e courier, replay idempotente, replay conflitante e produto fora do pedido.
- Cleanup confirmado no banco: `0` usuários, `0` lojas e `0` reviews com prefixo do smoke.
- Matriz local completa: 38 arquivos de teste, 182 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados. O lint exibiu apenas o warning já conhecido de `MODULE_TYPELESS_PACKAGE_JSON` do ESLint config.

## Limites preservados

Esta fase não homologa PSP/PIX real, refund em provedor real, webhook externo, CNPJ, domínio definitivo, OAuth real, e-mail, push, storage externo, observabilidade externa, backup contínuo, Android/iOS físico ou publicação em lojas. Esses itens continuam pendentes conforme `docs/INSTRUCAO_EXECUCAO_GO_LIVE_PR7.md` e o plano oficial.

A fase fecha somente estes guardrails técnicos no ambiente verificável; o Go-Live comercial permanece bloqueado e o PR #7 não deve ser marcado como READY sem as evidências externas correspondentes.
