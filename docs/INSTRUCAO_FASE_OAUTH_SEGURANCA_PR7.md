# Instrução técnica — segurança OAuth no PR #7

## Objetivo

Endurecer a fronteira OAuth do Pediu sem simular um provedor real. A fase cobre apenas controles reproduzíveis no servidor e nos testes:

- rejeição fail-closed de `state` malformado, não canônico ou com redirect URI inseguro;
- proteção contra replay do mesmo par código/state durante a janela de processamento;
- respostas HTTP determinísticas para state inválido e callback repetido;
- preservação dos fluxos web e deep-link mobile já existentes.

A homologação com provedor OAuth real, credenciais de produção, redirect URIs definitivas e dispositivos físicos continua externa e pendente.

## Fonte da verdade e limites

- Todas as alterações serão feitas na branch `docs/go-live-plan`, head do PR #7.
- O plano oficial é `docs/GO_LIVE_PLAN.md`.
- Antes de cada alteração funcional, o bundle atual deve passar por deployment smoke, stress read-only e os smoke concorrentes existentes.
- Não haverá login real, troca de token real, criação de credenciais, publicação em produção ou marcação de OAuth como homologado.

## Estratégia

O servidor validará o `state` Base64 de forma estrita, decodificará somente redirect URIs com protocolo permitido (`http`, `https` ou o esquema nativo do Pediu), rejeitará credenciais e fragmentos na URL e manterá o valor original para a troca com o provedor.

O callback terá uma guarda de replay processual, com TTL curto e chave derivada por hash do authorization code, depois que o state já foi validado. A guarda será aplicada antes da troca de token e liberada quando o processamento falhar, sem registrar código, token ou state em logs. A proteção é um guardrail local; o provedor OAuth continua responsável pela validade definitiva do authorization code em ambiente distribuído.

## Critérios de aceite

- [x] Baseline do bundle atual aprovado antes da alteração.
- [x] State inválido não chama a troca de token e responde 400.
- [x] Redirect URI com protocolo, credenciais ou fragmento inválido é rejeitado.
- [x] Replay do mesmo callback é bloqueado sem segunda troca de token.
- [x] Falha transitória libera a guarda para uma nova tentativa controlada.
- [x] Web e deep-link permanecem compatíveis no contrato de redirect.
- [x] Matriz local completa, deployment smoke e stress aprovados após a alteração.
- [ ] CI e Operational Validation verdes no head publicado.

## Evidência

A matriz local passou com 29 arquivos, 126 testes aprovados e 1 ignorado; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` ficaram verdes. O bundle recompilado passou no callback inválido HTTP (`400`, sem chamada ao provedor), deployment smoke com health 200/marketplace 200/CORS exato/métricas protegidas e stress read-only de 120 requests/12 workers com p50 de 19,1 ms, p95 de 42,5 ms, máximo de 65,6 ms e erro 0%. Os E2Es operacionais, checkout/webhook concorrente e fiado permaneceram aprovados.

Os testes focados cobrem state inválido, redirects inseguros, replay bloqueado e retry após falha transitória. OAuth de produção seguirá explicitamente como dependência externa até haver provedor, credenciais, redirect URIs definitivas, dispositivo e homologação real. O CI e o Operational Validation ainda precisam passar no head desta fase.
