# Instrução técnica — rate limit distribuído no PR #7

## Objetivo

Fechar a lacuna interna P1 de limitação por processo. As operações caras e sensíveis do Pediu devem compartilhar a mesma janela entre réplicas do backend, resistir a concorrência e responder com contrato HTTP/tRPC claro quando o limite for atingido.

## Escopo vertical

- migration `0032_distributed_rate_limit` com buckets InnoDB persistentes em `pediu_rate_limit_buckets`;
- consumo atômico por chave, sujeito a lock transacional, limite e janela bounded;
- chave composta por escopo, identidade de usuário quando disponível e fingerprint não reversível do IP;
- enforcement distribuído em `orders.create`, `payments.createPix`, `ads.generate`, `voice.interpret` e `voice.transcribe`;
- retries idempotentes de pedido e cobrança retornam o recurso existente antes de consumir nova cota;
- erro `TOO_MANY_REQUESTS` com header `Retry-After`; falha do armazenamento compartilhado é fail-closed como `SERVICE_UNAVAILABLE`;
- sweeper nativo com intervalo e lote bounded, cuja exclusão revalida `expiresAt` para não apagar uma janela renovada em corrida;
- readiness e Operational Validation exigem a tabela nova;
- smoke E2E real de oito consumidores concorrentes, 429 HTTP, `Retry-After`, cleanup e ausência de fixtures;
- testes puros e de contrato sem exigir banco para callers unitários, mantendo o transporte Express real sempre distribuído.

## Limites externos

Não há Redis, serviço de rate limiting gerenciado, WAF, CDN ou contador global multi-região nesta fase. O bucket usa o MySQL/MariaDB operacional já obrigatório do PR #7; alta disponibilidade, failover, replicação cross-region, proteção L7 de borda e tuning de infraestrutura continuam externos à aplicação.

O PSP/PIX real não foi simulado como homologado. Os smokes financeiros usam somente o mock PSP local autorizado e não provam CNPJ, credencial real, webhook público, refund real ou reconciliação com o Mercado Pago.

## Invariantes

1. Uma janela não pode permitir mais que `limit` consumos mesmo com réplicas concorrentes.
2. A chave de idempotência recuperada não consome nova cota para retry legítimo.
3. A resposta bloqueada é `TOO_MANY_REQUESTS` e informa `Retry-After` em segundos.
4. Se o banco de buckets estiver indisponível, a operação protegida não executa parcialmente.
5. O sweeper só remove linhas que continuam expiradas no momento do `DELETE`; uma janela renovada entre seleção e remoção é preservada.
6. TTL, lote e intervalo possuem limites máximos/mínimos e não podem ser configurados para loops sem bound.
7. O fingerprint de rede é hash com segredo do servidor e não persiste o IP em claro.
8. Operações read-only de marketplace e o fluxo courier existente não são limitados por esta fase.

## Gates obrigatórios

- baseline de deployment/stress antes da alteração;
- migration aplicada em banco MySQL limpo e no banco local de validação;
- regressões de domínio, enforcement, readiness e contrato tRPC;
- `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier nos formatos suportados e `git diff --check`;
- bundle de produção com health/readiness, smoke E2E e stress 120/12;
- deployment smoke e stress HTTPS temporário;
- regressão dos smokes operacionais de pedidos, fiado, finance, serviceability, expiração, dispatch, tracking, outbox e limites;
- CI e Operational Validation verdes antes da próxima fase.

## Evidências executadas — 02/10/2026

| Validação                          | Resultado                                                                                                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration limpa                    | Banco MySQL temporário `pediu_go_live_phase48_fresh`; 33 migrations aplicadas, 43 tabelas presentes e `pediu_rate_limit_buckets` confirmado                                                                    |
| Migration de validação             | `pnpm exec drizzle-kit migrate` aplicado no banco real local; colunas `bucketKey`, `requestCount`, `windowStartedAt`, `expiresAt`, `updatedAt` e índice de expiração confirmados                               |
| Regressões focadas                 | 10 testes aprovados para política, enforcement e readiness                                                                                                                                                     |
| Matriz local final                 | 46 arquivos, 225 testes aprovados; `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados                                                                               |
| Smoke E2E final                    | Oito consumidores concorrentes produziram exatamente 1 permitido e 7 bloqueados; HTTP produziu 1 resposta 429 de 21 tentativas, com `Retry-After`, e cleanup bounded removeu bucket expirado                   |
| Regressões operacionais            | Finance/refund/reconciliação, serviceability/pickup, expiração de inventário, dispatch/reoferta, tracking, outbox, concorrência checkout, fiado e limites HTTP aprovados no bundle de teste com mock PSP local |
| Cleanup SQL                        | 0 buckets de rate limit, 0 usuários `ci-*`, 0 lojas de smoke e 0 pedidos com chave `ci-*` residuais                                                                                                            |
| Readiness final                    | `/api/health` 200 e `/api/readyz` 200 com database, migrations e tables em `pass`                                                                                                                              |
| Deployment smoke local             | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas                                                                                                                                      |
| Stress local read-only             | 120 requests / 12 workers; p50 20,9 ms; p95 38,1 ms; máximo 76,6 ms; erro 0%                                                                                                                                   |
| Deployment/stress HTTPS temporário | Smoke aprovado; 40 requests / 4 workers; p50 13,6 ms; p95 53,5 ms; máximo 144,8 ms; erro 0%                                                                                                                    |

A fase fecha somente a proteção interna de aplicação. Não declara READY comercial: permanecem externos PSP/PIX/CNPJ e homologação real, OAuth/provedores, Expo Push/receipts e dispositivos físicos, e-mail/SMS, storage, observabilidade/backup, scheduler/hosting definitivo, domínio/staging/produção, WAF/CDN, Redis/rate-limit gerenciado, alta disponibilidade cross-region, GPS/background e publicação nas lojas.
