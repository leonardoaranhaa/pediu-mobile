# Instrução técnica — outbox persistente de notificações no PR #7

## Objetivo

Eliminar a entrega inline e best-effort de push das transações operacionais. Toda notificação dirigida a cliente, lojista, entregador ou suporte deve primeiro ser registrada localmente e enfileirada de forma atômica; a entrega ao Expo Push Service fica desacoplada, retryable e observável.

## Escopo

- migration `0030_notification_outbox` e tabela `pediu_notification_outbox` com vínculo único à notificação local, payload limitado pelo contrato existente, status, tentativa, lock, backoff e erro;
- `sendPushToUser` persistindo notificação e outbox na mesma transação;
- worker nativo do backend com intervalo bounded, claim com lock, recuperação de lock stale, preferências por tipo, ausência de token, sucesso, erro transitório e falha terminal;
- backoff determinístico de 30 s, 120 s, 300 s e 900 s, máximo de cinco tentativas;
- readiness e Operational Validation exigindo a nova tabela;
- smoke E2E real com mock HTTP local do provedor, falha 503, retry bem-sucedido, entrega e preferência desabilitada;
- nenhuma alegação de homologação do Expo Push Service ou de push físico em dispositivo real.

## Invariantes e limites

1. A notificação in-app e o item de outbox são criados na mesma transação; não pode existir notificação local sem item de entrega.
2. Um item só pode ser processado por uma instância por vez; lock stale é recuperado após dois minutos.
3. Preferência desabilitada termina o item como `skipped`, sem chamada externa.
4. Falha ou ausência de token volta a `pending` com backoff até cinco tentativas; depois termina como `failed` com erro truncado.
5. O worker é aplicação-nativa, bounded e não substitui scheduler externo nem garante entrega sem credenciais/tokens/serviço de push.
6. O payload não pode conter credenciais, segredos ou dados além do contexto de notificação já autorizado.

## Gates obrigatórios

- `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier nos arquivos suportados e `git diff --check`;
- migration aplicada em banco MySQL limpo/temporário e readiness com a tabela nova;
- `pnpm go-live:notification-outbox` com fixture real, cleanup SQL e mock HTTP local;
- bundle de produção recompilado com `/api/health` e `/api/readyz` 200;
- deployment smoke e stress read-only local 120/12;
- deployment smoke e stress HTTPS temporário autorizado;
- CI e Operational Validation verdes no PR #7 antes da próxima fatia.

## Pendências externas

A fase não configura nem homologa PSP/PIX, CNPJ, OAuth, Expo Push Service, tokens reais de dispositivos, credenciais de produção, e-mail/SMS, observabilidade, backup, scheduler/hosting, domínio, GPS/background ou lojas. O PR #7 e o Go-Live comercial continuam não READY enquanto essas dependências externas não tiverem prova real.

## Evidências

Fase validada sobre o head verde do PR #7 e migration 0030 aplicada no MySQL 8.0 de validação. O mock HTTP local representa apenas o contrato de resposta do provedor; não é homologação do Expo Push Service nem prova de entrega em dispositivo.

| Validação                         | Resultado                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Migration real                    | `pnpm exec drizzle-kit migrate` aplicado; tabela `pediu_notification_outbox` presente; journal com 31 migrations      |
| Regressões locais                 | 43 arquivos de teste, 214 testes aprovados                                                                            |
| Matriz local final                | `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier nos arquivos suportados e `git diff --check` aprovados |
| Smoke E2E real                    | Enqueue atômico, falha 503, retry após backoff, entrega 200 pelo mock e preferência desabilitada como `skipped`       |
| Cleanup SQL                       | 0 usuários, 0 notificações e 0 itens de outbox com marcadores da fase residuais                                       |
| Readiness do bundle final         | `/api/health` 200; `/api/readyz` 200 com database, migrations e tables em `pass`                                      |
| Deployment smoke local            | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas                                             |
| Stress local read-only            | 120 requests / 12 workers; p50 30,7 ms; p95 84,7 ms; máximo 112,1 ms; erro 0%                                         |
| Regressão courier no bundle final | Expiração/reoferta, concorrência, aceite e ausência de candidato aprovados                                            |
| Deployment smoke HTTPS temporário | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas                                             |
| Stress HTTPS temporário           | 40 requests / 4 workers; p50 12,1 ms; p95 51,6 ms; máximo 153,7 ms; erro 0%                                           |

O worker permanece dependente de tokens de dispositivo, URL/credencial e política de produção do provedor externo. Push físico, Expo Push Service, e-mail/SMS, OAuth, PSP/PIX/CNPJ, storage, observabilidade/backup, scheduler/hosting, domínio, GPS/background e lojas continuam externos. O PR #7 e o Go-Live comercial permanecem não READY.
