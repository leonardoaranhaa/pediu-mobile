# Instrução técnica — serviceability por endereço e pickup no PR #7

## Objetivo

Fechar a lacuna P1 identificada no Go-Live: o checkout não pode aceitar uma entrega sem verificar se o endereço está dentro da área atendida, e o cliente precisa poder escolher retirada no estabelecimento quando essa modalidade estiver habilitada.

A fase deve preservar o fluxo já publicado no PR #7, o inventário quantitativo, a idempotência de pedidos e o PSP pendente. Nenhum pagamento real, geocodificação externa ou promessa de cobertura será simulada.

## Escopo implementável nesta fase

- Persistir no estabelecimento a configuração de entrega: habilitada/desabilitada, retirada habilitada, latitude/longitude de referência e raio máximo em quilômetros.
- Persistir no pedido a modalidade efetivamente escolhida (`delivery` ou `pickup`) e o snapshot da taxa calculada no checkout.
- Calcular distância por Haversine no servidor usando coordenadas persistidas; rejeitar entrega quando faltarem coordenadas ou quando exceder o raio configurado.
- Calcular cotação server-side para entrega e retirada, sem confiar em taxa/total enviados pelo cliente.
- Exigir endereço salvo com coordenadas para `delivery`; permitir `pickup` sem endereço e com taxa zero.
- Expor a configuração da loja ao lojista e exibir a escolha de modalidade, taxa e motivo de indisponibilidade no checkout do cliente.
- Adicionar smoke E2E contra MariaDB real para: entrega dentro do raio, entrega fora do raio, retirada, total/taxa persistidos e tentativa incompatível bloqueada.

## Fora do escopo e ainda externo

- Geocodificação e autocomplete de endereço por provedor externo.
- GPS/background tracking em dispositivos físicos.
- PSP/PIX real, OAuth real, push/e-mail externos, storage externo, domínio/staging/produção definitivos e lojas.
- Substituições de produto e fallback completo de despacho; serão fases posteriores.

## Método obrigatório

1. Executar baseline de deployment smoke e stress read-only antes da alteração.
2. Alterar schema, migration, domínio, rotas, UI, testes e smoke no mesmo incremento vertical.
3. Aplicar a migration em banco real de validação e em banco limpo temporário.
4. Executar regressões focadas, matriz completa (`test`, `check`, `build`, `lint`, Prettier e `git diff --check`).
5. Recompilar o bundle de produção e validar `/api/readyz`, deployment smoke, stress e o novo smoke E2E real.
6. Confirmar cleanup SQL sem fixtures residuais.
7. Registrar somente evidências comprovadas no `GO_LIVE_PLAN.md`, publicar no branch `docs/go-live-plan` e aguardar CI/Operational Validation verdes.

## Critérios de aceite

- Uma loja com delivery habilitado e coordenadas configuradas aceita somente endereço dentro do raio.
- Uma entrega fora da área retorna erro explícito antes de criar pedido, pagamento ou reserva.
- Uma loja com pickup habilitado permite retirada sem endereço, taxa zero e pedido marcado como `pickup`.
- A taxa e a modalidade persistidas são snapshots do cálculo server-side.
- Retries idempotentes preservam modalidade, taxa e um único pedido/pagamento.
- O smoke concorrente e os gates de stress/deployment permanecem verdes.
- A documentação mantém o Go-Live comercial bloqueado pelas dependências externas reais.

## Evidências

Fase executada sobre o head publicado do PR #7, com a migration `0029_serviceability_pickup.sql` aplicada em banco MySQL 8.0 limpo e no banco MySQL 8.0 local de validação. O smoke `pnpm go-live:serviceability` passou no bundle compilado de produção, cobrindo entrega dentro do raio, bloqueio fora do raio antes da criação do pedido, retirada sem endereço/taxa e persistência dos snapshots; o cleanup final confirmou zero usuários, lojas, produtos e pedidos com prefixo da fase.

| Validação | Resultado |
| --- | --- |
| Regressões focadas | Domínio, router marketplace, estados de pedido e fronteira courier aprovados |
| Matriz local final | 40 arquivos de teste, 203 testes aprovados; `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier nos arquivos suportados e `git diff --check` aprovados |
| Readiness no bundle recompilado | `/api/health` 200; `/api/readyz` 200 com database, migrations e tables em `pass` |
| Smoke serviceability real | Entrega interna aprovada; entrega externa bloqueada; pickup cotado e criado com `deliveryFeeSnapshot=0.00` |
| Deployment smoke local | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas |
| Stress local read-only | 120 requests / 12 workers; p50 29,8 ms; p95 101,9 ms; máximo 128,8 ms; erro 0% |
| Deployment smoke público temporário | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas |
| Stress público temporário | 40 requests / 4 workers; p50 11,2 ms; p95 43,0 ms; máximo 137,5 ms; erro 0% |
| Cleanup SQL final | 0 usuários, 0 lojas, 0 produtos e 0 pedidos de serviceability residuais |

O smoke e o mock de pagamento local não homologam PSP/PIX real. Permanecem externos: CNPJ e credenciais/homologação do PSP, webhook real, OAuth real, push/e-mail externos, storage externo, geocodificação/autocomplete, GPS/background em dispositivos físicos, domínio/staging/produção definitivos, observabilidade/backup externos e publicação nas lojas. O Go-Live comercial e o PR #7 continuam bloqueados e não devem ser marcados como READY.
