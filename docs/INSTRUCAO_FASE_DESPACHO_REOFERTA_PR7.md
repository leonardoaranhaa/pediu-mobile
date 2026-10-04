# Instrução técnica — expiração e reoferta de despacho courier no PR #7

## Objetivo

Fechar a lacuna P1 do despacho: uma oferta courier não pode ficar pendente até que o entregador consulte a inbox, e uma oferta expirada ou recusada deve permitir reoferta segura a outro entregador elegível sem duplicar atribuição.

A fase preserva o fluxo delivery/pickup já publicado, a autorização por loja e vínculo, a idempotência das ofertas, o rastreamento GPS e o PSP real pendente. Não haverá despacho para pedidos `pickup` nem geolocalização/rastreamento externo simulado.

## Escopo implementável nesta fase

- Adicionar sweeper global de ofertas courier pendentes expiradas, iniciado com o backend e seguro para múltiplas instâncias via lock transacional.
- Ao expirar uma oferta, marcar a oferta como `expired` e reofertar, no máximo uma vez por ciclo, ao primeiro entregador vinculado à loja, aprovado, disponível e ainda não tentado para aquele pedido.
- Ao recusar uma oferta, reofertar na mesma transação para um candidato elegível, sem abrir uma segunda atribuição.
- Manter o pedido em `Pronto` quando não houver candidato; o lojista continua podendo atribuir manualmente pelo contrato existente.
- Não reofertar se o pedido deixou `Pronto`, já possui atribuição ou já está em pickup.
- Fazer a inbox do entregador também disparar o sweep bounded, para reduzir latência sem depender somente do timer.
- Usar chave de idempotência determinística por pedido/candidato e TTL bounded; a aceitação continua sendo a única operação que cria `deliveryAssignments`.
- Adicionar testes puros, regressões de router e smoke E2E real com dois entregadores: expiração/reoferta, recusa/reoferta, retry concorrente, candidato já tentado, ausência de candidato e preservação do fluxo courier existente.

## Fora do escopo e ainda externo

- Matching por distância/GPS, cálculo de tarifa dinâmica, leilão, roteirização, background location físico e notificações push garantidas.
- Cadastro/aprovação real de entregadores além do contrato local já existente.
- Scheduler/hosting definitivo, Redis/fila distribuída, observabilidade externa, backup, domínio/staging/produção definitivos e publicação nas lojas.
- PSP/PIX real, CNPJ, credenciais, webhook real e homologação autorizada.

## Método obrigatório

1. Usar os gates publicados das fases 43/44 como baseline, sem alterar o fluxo já verde.
2. Alterar domínio, persistência/roteamento, worker, testes, smoke e documentação no mesmo incremento vertical; sem migration se o schema atual for suficiente.
3. Executar regressões courier e matriz completa (`check`, `test`, `build`, `lint`, Prettier e `git diff --check`).
4. Executar smoke contra MySQL 8.0 real, com concorrência e cleanup SQL.
5. Recompilar o bundle de produção e validar `/api/health`, `/api/readyz`, deployment smoke e stress local.
6. Validar o caminho HTTPS temporário com smoke e carga read-only autorizada.
7. Registrar somente evidências comprovadas no `GO_LIVE_PLAN.md`, publicar em `docs/go-live-plan` e aguardar CI/Operational Validation verdes.

## Critérios de aceite

- Oferta pendente expirada deixa de aparecer como pendente e gera no máximo uma reoferta elegível.
- Oferta recusada gera no máximo uma reoferta elegível na mesma operação.
- Dois sweepers concorrentes não criam duas reofertas ou atribuições para o mesmo pedido.
- Entregador já tentado, não aprovado, indisponível ou não vinculado não recebe reoferta.
- Pedido fora de `Pronto`, pedido com atribuição e pickup não recebem reoferta.
- Sem candidato, o pedido permanece `Pronto` e o operador pode usar o caminho manual sem erro de corrupção.
- Aceite idempotente continua criando uma única atribuição e cancela ofertas irmãs.
- O fluxo delivery existente de GPS, transição e conclusão permanece verde.
- O Go-Live comercial continua bloqueado pelas dependências externas reais.

## Evidências

Fase executada sobre o head publicado do PR #7, sem nova migration: o schema de ofertas, vínculos, perfis e atribuições existente foi suficiente. O smoke `pnpm go-live:dispatch-reoffer` passou duas vezes no MySQL 8.0 local, sendo a segunda no mesmo bundle final usado nos gates de deployment; o cleanup confirmou zero fixtures da fase.

| Validação                         | Resultado                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Regressões focadas                | Domínio de despacho, router courier, atribuição, GPS, estados de pedido e pickup aprovados; 23 testes                                     |
| Matriz local final                | 42 arquivos de teste, 211 testes aprovados; `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados |
| Smoke E2E real no bundle final    | Expiração/reoferta, recusa/reoferta, concorrência, aceite único e ausência de candidato aprovados                                         |
| Concorrência/idempotência         | Duas consultas courier concorrentes produziram uma única oferta pendente; aceite criou uma atribuição                                     |
| Preservação operacional           | Pedido sem candidato permaneceu `Pronto`; pickup continua sem atribuição/oferta courier                                                   |
| Cleanup SQL                       | 0 usuários, 0 lojas, 0 pedidos e 0 ofertas com prefixo `ci-dispatch-`/`dispatch-reoffer-` residuais                                       |
| Readiness do bundle recompilado   | `/api/health` 200; `/api/readyz` 200 com database, migrations e tables em `pass`                                                          |
| Deployment smoke local            | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas                                                                 |
| Stress local read-only            | 120 requests / 12 workers; p50 23,3 ms; p95 72,2 ms; máximo 89,8 ms; erro 0%                                                              |
| Deployment smoke HTTPS temporário | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas                                                                 |
| Stress HTTPS temporário           | 40 requests / 4 workers; p50 14,3 ms; p95 45,8 ms; máximo 127,6 ms; erro 0%                                                               |

O dispatch continua bounded por TTL e lista de candidatos vinculados; não há matching por distância, tarifa dinâmica, fila distribuída ou push garantido. A implementação e o mock local não homologam PSP/PIX real. Permanecem externos CNPJ, credenciais/homologação do PSP, webhook real, OAuth real, push/e-mail, storage, observabilidade/backup, scheduler/hosting definitivo, domínio/staging/produção, GPS/background físico e publicação nas lojas. O Go-Live comercial e o PR #7 continuam bloqueados e não READY.
