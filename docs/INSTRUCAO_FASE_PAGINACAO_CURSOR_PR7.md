# Instrução técnica — paginação por cursor no PR #7

## Objetivo

Fechar a lacuna interna P1 de paginação por `offset` nas listagens de marketplace. O catálogo precisa avançar por uma chave estável e limitada, sem custo crescente de `OFFSET`, sem duplicar ou pular itens quando novos produtos/anúncios entram entre duas leituras e sem transferir todos os resultados para o cliente.

## Baseline da fase

A fase 48 foi concluída sobre o commit `615c4fc` com CI e Operational Validation verdes. O bundle final atingiu stress read-only local de 120 requests/12 workers com p95 de 38,1 ms e deployment/stress HTTPS temporário de 40 requests/4 workers com p95 de 53,5 ms e erro 0%. Essa medição é a referência da fase 49; a nova listagem deve ser medida no mesmo tipo de bundle e carga.

## Escopo vertical

- cursor opaco, versionado e validado para a ordenação do marketplace;
- keyset pagination pela ordem existente: anúncio publicado descendente, `products.createdAt` descendente e `products.id` descendente;
- `nextCursor` retornado junto com `hasMore`, mantendo `offset` temporariamente aceito para compatibilidade de clientes legados;
- cliente Expo de busca usando `useInfiniteQuery`, acumulando páginas e exibindo loading/error de próxima página;
- home e telas de catálogo continuam usando o mesmo contrato server-side e não inventam paginação local;
- regressões para cursor inválido, filtros estáveis, limite bounded, ausência de duplicação e ordem determinística;
- smoke E2E real contra MySQL e bundle compilado, com inserção entre páginas e cleanup completo;
- medição de deployment/stress antes de fechar a fase.

## Fora do escopo e limites externos

Não implementar nesta fase busca full-text, ranking/recomendação, cache distribuído, CDN, infinite scroll nativo para todas as telas, migração de todos os endpoints administrativos ou presign de storage. O presign em lote depende do contrato do Forge/storage externo e continua separado até haver API de lote documentada e credencial real.

PSP/PIX/CNPJ, OAuth, Expo Push/receipts, storage/Forge, mapas/GPS, e-mail/SMS, observabilidade/backup contínuos, scheduler/hosting, domínio/staging/produção e publicação nas lojas continuam dependências externas. A fase não pode declarar Go-Live comercial READY.

## Invariantes

1. O cursor não expõe SQL nem permite alterar filtros/ordem silenciosamente.
2. Cursor malformado, de versão desconhecida, com data inválida ou IDs inválidos falha fechado com erro de entrada.
3. A página seguinte começa estritamente após o último item da página anterior na ordem completa.
4. A mesma combinação de filtros e cursor não retorna duplicatas por causa de `OFFSET` implícito.
5. `limit` permanece bounded entre 1 e 50; o servidor sempre busca no máximo `limit + 1` itens.
6. Se um item novo for inserido entre páginas, ele não desloca a continuação já delimitada pelo cursor.
7. O cliente mantém as páginas carregadas e não substitui resultados anteriores ao buscar a próxima página.
8. O contrato legado com `offset` continua funcional durante a transição, mas o app novo não o utiliza.

## Gates obrigatórios

- baseline da fase 48 registrado antes da alteração;
- migration somente se a medição do plano justificar índice composto; validar em MySQL limpo e banco de execução;
- testes puros de cursor, router e banco real;
- `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier nos formatos suportados e `git diff --check`;
- smoke E2E de múltiplas páginas com inserção entre leituras e cleanup;
- bundle de produção com health/readiness, deployment smoke e stress 120/12;
- deployment/stress HTTPS temporário;
- CI e Operational Validation verdes antes de outra fase.

## Critério de conclusão

A fase só será registrada no plano como concluída após evidência de ordem, continuidade, ausência de duplicação, compatibilidade de filtros, cliente acumulando páginas, cleanup SQL zero, matriz local verde e dois deployments/stresses sem regressão material frente ao baseline.

## Evidências executadas — 02/10/2026

O contrato server-side foi implementado sem migration adicional: o cursor codifica versão, filtros normalizados, `generatedAds.id`, `products.createdAt` e `products.id`; a continuação usa keyset estrito e mantém `offset` apenas como compatibilidade. O cliente `app/search.tsx` passou a usar `useInfiniteQuery` e acumular as páginas carregadas.

Os testes unitários e de router ficaram verdes: `pnpm check`, 47 arquivos e 232 testes em `pnpm test`, `pnpm build`, `pnpm lint`, Prettier dos arquivos suportados e `git diff --check` passaram. O smoke real `pnpm go-live:pagination`, contra MySQL e o dist final de produção na porta 3022, retornou páginas `[10, 10, 5]`, `noDuplicates=true`, `insertionDidNotShiftCursor=true` e `malformedCursorRejected=true`; a consulta SQL posterior confirmou `cursorProductsRemaining=0` e `cursorUsersRemaining=0`.

O deployment smoke local passou com health/readiness 200, marketplace 200, CORS exato e métricas protegidas. O stress local read-only de 120 requests/12 workers passou com p50 18,5 ms, p95 41,2 ms, máximo 104,0 ms e erro 0%. O deployment HTTPS temporário `https://3022-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer` passou com health/readiness/marketplace 200, CORS exato e métricas protegidas; o stress HTTPS autorizado de 40 requests/4 workers passou com p50 11,3 ms, p95 38,7 ms, máximo 129,4 ms e erro 0%.

Não houve acesso a PSP/PIX real, storage/Forge externo, push/receipts, OAuth real, mapas/GPS, e-mail/SMS, backup/restore operacional contínuo, hosting/domínio de produção ou dispositivos Android/iOS. Essas dependências permanecem externas e não foram simuladas como concluídas.
