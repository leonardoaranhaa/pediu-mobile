

## Implementação efetiva — 26/09/2026

A primeira fatia vertical do ambiente courier foi concluída no PR #7.

### Contratos e telas entregues

- `courier` foi adicionado ao enum de identidade e ao contrato de sessão.
- `pediu.courier.profile.mine`, `register`, `locationConsent` e `availability` foram expostos com procedures protegidas.
- `pediu.courier.offers`, `acceptOffer`, `rejectOffer` e `active` foram adicionados.
- A loja ganhou `stores.couriers` e `stores.linkCourier`.
- O router de experiência ganhou `delivery.offer` e passou a aceitar o courier atribuído no tracking e na conclusão.
- Foi criada a tela `/courier`, com cadastro, status de aprovação, disponibilidade, ofertas, aceite, consentimento, GPS em primeiro plano e conclusão.
- Foram criadas as telas `/seller/couriers` e `/admin/couriers`.
- A migration `0025_courier_flow.sql` criou perfil, vínculo e oferta com FKs, índices e idempotência.

### Guardrails operacionais

- A loja só cria oferta para pedido `Pronto`, entregador aprovado, disponível e vinculado à própria loja.
- O aceite ocorre em transação; duas ofertas concorrentes não geram duas atribuições.
- O courier só envia localização quando é o courier atribuído, aprovado e consentiu localização.
- A conclusão é idempotente e devolve o estado já entregue em repetição.
- O teardown do E2E remove logs administrativos antes das contas fixture, preservando a integridade referencial.

### Validações executadas

- MariaDB limpo: 25 migrations, 37 tabelas e 56 FKs.
- `pnpm check`, `pnpm lint` e testes direcionados verdes.
- E2E de produção local verde para cadastro, aprovação, vínculo, oferta, aceite, consentimento, tracking e conclusão idempotente.
- Deployment smoke local verde: health, marketplace e CORS.
- Estresse read-only verde: 120 requests, concorrência 12, p95 de 54,1 ms e erro 0%.
- O workflow operacional agora verifica as tabelas courier e executa esse E2E antes dos gates de estresse e deployment.

O PSP e o modelo de remuneração/repasse permanecem conscientemente pendentes até CNPJ, provedor e homologação financeira.


## Revalidação independente — 26/09/2026

A implementação foi reaplicada após a revisão do head do PR #7 e passou novamente por banco MariaDB limpo e bundle de produção. O E2E percorreu cadastro, aprovação admin, vínculo pela loja, oferta, aceite, consentimento de GPS, localização, tracking do cliente e conclusão idempotente. O banco terminou sem fixtures `ci-ops-*` ou auditorias residuais. Deployment smoke passou com health, marketplace e CORS exato; o estresse read-only passou com 120 requests, concorrência 12, p95 de 49,2 ms e erro 0%. A matriz `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` e `git diff --check` também passou.
