# Instrução técnica — CORS e proteção de mutation no PR #7

## Objetivo

Transformar os controles já presentes de origem e cookie em uma evidência operacional reproduzível:

- preflight permitido responde 204 e ecoa somente a origem configurada;
- preflight proibido responde 403 sem `Access-Control-Allow-Origin`;
- mutation tRPC sem Bearer e sem origem permitida responde 403;
- mutation tRPC com origem permitida atravessa a barreira e mantém o contrato de logout/cookie;
- cookie de sessão permanece `HttpOnly`, `Path=/`, `SameSite=Lax` e `Secure` somente quando a requisição é HTTPS ou possui proxy HTTPS confiável.

## Fonte da verdade e limites

- Todas as alterações pertencem à branch `docs/go-live-plan`, head do PR #7.
- O plano oficial é `docs/GO_LIVE_PLAN.md`.
- O baseline de deployment, stress e concorrência foi executado antes desta fase.
- Não serão permitidas origens wildcard em produção, credenciais expostas, submissões externas ou alteração de domínio real.

## Estratégia

Adicionar um smoke HTTP isolado, executável contra o bundle de produção, e testes unitários das regras de origem/cookie. O smoke usará somente endpoints públicos de health e `auth.logout`, sem banco ou dados de usuário, para provar a barreira de origem sem criar efeitos externos.

O teste deve distinguir CORS de autorização: uma origem proibida é bloqueada na camada HTTP, enquanto um Bearer válido pode atravessar a barreira de origem para clientes nativos que não dependem de cookie. A validação não deve aceitar `*` nem ecoar uma origem não configurada.

## Critérios de aceite

- [x] Baseline antes da fase registrado.
- [x] Smoke HTTP de CORS e mutation versionado.
- [x] Regressões unitárias de origem e cookie aprovadas.
- [x] Matriz local completa, deployment smoke e stress após a alteração.
- [ ] CI e Operational Validation verdes no head publicado.
- [ ] Dependências de domínio/origens definitivas continuam documentadas como externas.

## Evidência

O smoke HTTP passou contra o bundle recompilado: preflight permitido e mutation com origem permitida responderam corretamente; preflight e mutation de origem proibida retornaram 403 sem ecoar ACAO; mutation com Bearer atravessou a barreira; e o logout devolveu cookie protegido. A matriz local passou com 30 arquivos e 128 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` ficaram verdes. O deployment smoke passou com health 200, marketplace 200, CORS exato e métricas protegidas; stress 120/12 passou com p50 de 17,2 ms, p95 de 44,1 ms, máximo de 63,2 ms e erro 0%. Os E2Es operacionais, checkout/webhook concorrente e fiado permaneceram verdes.

Durante a regressão de logout foi corrigido o fallback para hostname ausente em `getSessionCookieOptions`; a correção foi coberta por teste e compilada no bundle. A existência do guardrail não será tratada como configuração dos domínios reais de staging/produção.
