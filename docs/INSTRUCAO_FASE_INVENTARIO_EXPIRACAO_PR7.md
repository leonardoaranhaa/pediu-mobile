# Instrução técnica — expiração e liberação de reservas no PR #7

## Objetivo

Fechar a lacuna P1 de reservas abandonadas identificada após o inventário quantitativo: uma reserva de estoque não pode permanecer indefinidamente presa quando o pedido fica pendente sem ação do cliente ou do lojista.

A fase preserva a reserva atômica já publicada, o fluxo de cancelamento/consumo, a idempotência de pedidos e o PSP real pendente. Nenhum pagamento externo é simulado ou estornado automaticamente.

## Escopo implementável nesta fase

- Definir TTL padrão de 30 minutos para reservas de pedidos em `Pendente`, com limites de configuração seguros.
- Expirar somente pedidos pendentes cujo `createdAt` esteja no cutoff; pedidos `Aceito`, `Preparando`, `Pronto` ou em trânsito não são cancelados pelo sweeper.
- Executar em uma transação com locks: mudar o pedido para `Cancelado`, liberar `reservedQuantity`, cancelar o pagamento local ainda `pending` e registrar o evento operacional.
- Ativar um sweeper nativo do backend após o servidor iniciar, com intervalo padrão de 60 segundos e proteção contra sobreposição na mesma instância; locks de banco tornam múltiplas instâncias seguras.
- Manter o pagamento terminal: uma confirmação tardia não pode reabrir pagamento local cancelado; ela deve ser ignorada pela máquina de estados e permanecer disponível para reconciliação operacional.
- Adicionar smoke real com duas execuções concorrentes do sweeper, pedido pendente expirável, pedido `Aceito` preservado, liberação, cancelamento de pagamento, idempotência e cleanup.

## Fora do escopo e ainda externo

- Cancelamento ou estorno no PSP real, inclusive quando uma cobrança externa for aprovada depois do TTL.
- Política comercial de prazo por loja, cobrança de taxa, reembolso ao cliente ou notificações push/e-mail garantidas.
- Scheduler/hosting definitivo, observabilidade externa, backup contínuo, OAuth/push/e-mail/storage externos, GPS físico, domínio, staging/produção definitivos e publicação nas lojas.
- PSP/PIX real, CNPJ, credenciais, webhook real e homologação autorizada.

## Método obrigatório

1. Usar o deployment/stress da fase 43 como baseline e medir novamente no bundle recompilado.
2. Alterar domínio, persistência, worker, testes e smoke no mesmo incremento vertical.
3. Executar regressões focadas e matriz completa (`check`, `test`, `build`, `lint`, Prettier e `git diff --check`).
4. Executar o smoke contra MySQL 8.0 real de validação e confirmar cleanup SQL.
5. Recompilar o bundle de produção e validar `/api/health`, `/api/readyz`, deployment smoke e stress local.
6. Validar também o caminho HTTPS temporário com smoke e carga read-only autorizada.
7. Registrar somente evidências comprovadas no `GO_LIVE_PLAN.md`, publicar no branch `docs/go-live-plan` e aguardar CI/Operational Validation verdes.

## Critérios de aceite

- Uma reserva pendente ultrapassando o TTL é cancelada uma única vez e libera exatamente suas unidades.
- A operação é atômica: pedido, reserva, pagamento local pendente e evento não ficam em estados parciais.
- Dois sweepers concorrentes não liberam a mesma reserva duas vezes.
- Pedido já `Aceito` não é cancelado pelo sweep de pendências.
- Pagamento local cancelado não pode voltar a `paid` por webhook tardio; o caso fica sujeito à reconciliação/estorno real.
- O processo não mantém conexões ou jobs residuais no smoke e o cleanup deixa zero fixtures.
- Os gates de stress/deployment e a suíte completa permanecem verdes.
- O Go-Live comercial continua bloqueado pelas dependências externas reais.

## Evidências

Fase executada sobre o head publicado do PR #7, sem nova migration: a alteração usa as colunas de inventário e status já presentes na migration `0028_inventory_reservation.sql`. O smoke `pnpm go-live:inventory-expiry` passou no MySQL 8.0 local, incluindo dois sweepers concorrentes; o cleanup confirmou zero usuários, produtos e pedidos com prefixo da fase.

| Validação                         | Resultado                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Regressões focadas                | Domínio de inventário, máquina de pagamento, pedidos e consistência transacional aprovados; 16 testes                                            |
| Matriz local final                | 41 arquivos de teste, 207 testes aprovados; `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados        |
| Smoke de expiração real           | Pedido `Pendente` antigo cancelado; pedido `Aceito` antigo preservado; reserva liberada; pagamento local cancelado; segunda execução idempotente |
| Concorrência do sweeper           | Duas transações simultâneas produziram exatamente uma expiração e uma liberação                                                                  |
| Cleanup SQL                       | 0 usuários, 0 produtos e 0 pedidos com prefixo `ci-inventory-expiry-` residuais                                                                  |
| Readiness do bundle recompilado   | `/api/health` 200; `/api/readyz` 200 com database, migrations e tables em `pass`                                                                 |
| Deployment smoke local            | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas                                                                        |
| Stress local read-only            | 120 requests / 12 workers; p50 24,8 ms; p95 68,4 ms; máximo 82,7 ms; erro 0%                                                                     |
| Deployment smoke HTTPS temporário | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas                                                                        |
| Stress HTTPS temporário           | 40 requests / 4 workers; p50 13,1 ms; p95 44,6 ms; máximo 138,6 ms; erro 0%                                                                      |

A primeira tentativa de iniciar o bundle de produção foi abortada pela validação de configuração porque o ambiente temporário não continha `VITE_APP_ID`, `JWT_SECRET`, `ALLOWED_ORIGINS` e `OBSERVABILITY_TOKEN`; nenhum request chegou ao servidor. A repetição com configuração determinística completa passou nos gates acima. Isso não foi tratado como falha da implementação.

O mock local e o cancelamento do pagamento local não homologam PSP/PIX real. Uma aprovação tardia no PSP pode exigir reconciliação e estorno real por operador autorizado; esse fluxo externo não é automatizado nem declarado concluído nesta fase. O Go-Live comercial e o PR #7 continuam bloqueados e não READY.
