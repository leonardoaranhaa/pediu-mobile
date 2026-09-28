# Instrução técnica — unificação UX/UI do PR #7

## Objetivo

Reunir na branch `docs/go-live-plan` os avanços de experiência que estavam na `feat/customer-ai-ads`, sem reverter as entregas operacionais já validadas no PR #7.

A unificação inclui:

- mascote Pediu com cenas programadas, balões discretos, piscar, gestos, reações de fome, alegria, privacidade e barriga cheia;
- personalização persistida localmente para tema, estilo do mascote, ativação e movimento;
- carrinho persistido e protegido contra exibição indevida quando a sessão está deslogada;
- tela de benefícios/cupons e aplicação de cupom no quote/checkout;
- estúdio de anúncios personalizados por IA para o lojista, com créditos, geração, publicação, arquivamento e isolamento por loja;
- mídia gerada exposta somente por URL assinada quando o storage externo estiver configurado;
- preservação do fluxo de entregador, courier, checkout idempotente, webhooks, fiado, OAuth, CORS, storage, limites e observabilidade já publicados.

## Estratégia de merge

Foi usado merge de três vias entre o head do PR #7 e `feat/customer-ai-ads`. Os conflitos foram resolvidos preservando ambos os lados:

- `app/account/profile.tsx`: personalização do mascote e entrada da Central do entregador;
- `drizzle/meta/_journal.json`: migrações `0024_ai_ads` e `0025_courier_flow` mantidas em sequência;
- `server/db.ts`: operações de courier, idempotência e anúncios unificadas;
- `server/routers.ts`: contratos de marketplace atuais preservados com enriquecimento opcional de mídia assinada.

## Evidências locais

- `pnpm test`: 34 arquivos e 142 testes aprovados;
- `pnpm check`: aprovado;
- `pnpm build`: bundle API produzido;
- `pnpm lint`: aprovado; somente aviso conhecido de `MODULE_TYPELESS_PACKAGE_JSON` do ESLint;
- Prettier nos arquivos alterados e `git diff --check`: aprovados;
- migration smoke: `0024_ai_ads` aplicada no MariaDB real de validação; tabelas `pediu_ad_credits` e `pediu_generated_ads` presentes; journal com 26 migrations;
- preflight Expo público: 6 PASS, 0 BLOCKED e 5 `NOT_CONFIGURED`, com API HTTPS pública e app ID alinhado;
- as cinco dependências `NOT_CONFIGURED` permanecem abertas: OAuth real, push externo, storage externo, PSP/PIX e evidência física Android/iOS.

## Gates operacionais no bundle unificado

- deployment smoke: health 200, marketplace 200, CORS exato e métricas protegidas;
- stress read-only: 120 requests, 12 workers, erro 0%;
- E2E cliente: catálogo, endereço, quote, PIX pendente, retry idempotente e fluxo de status;
- E2E operacional: courier, vínculo de loja, oferta, aceite, GPS, tracking e conclusão idempotente;
- concorrência checkout/webhook: 24 retries colapsados em um pedido/pagamento/evento;
- concorrência fiado: retry same-key idempotente e oversubscription rejected;
- CORS/cookies, storage namespace/traversal e limites de payload/voz: aprovados.

## Limites de aceite

Esta instrução não fecha o Go-Live comercial. O PSP/PIX continua pendente por CNPJ, e as demais dependências externas acima continuam explicitamente não configuradas até haver credenciais, ambiente definitivo ou evidência física correspondente.
