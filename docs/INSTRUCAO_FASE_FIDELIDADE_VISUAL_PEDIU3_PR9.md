# Fase de fidelidade visual Pediu3 sobre PR #9

## Objetivo

Portar para o Expo a composição visual observada no `leonardoaranhaa/pediu3`, preservando os contratos reais já entregues no PR #9: autenticação, catálogo/marketplace, Flash, Mercado, Taste, Club, checkout server-side, courier, pedidos e console operacional.

## Fonte visual copiada

- `Fredoka.ttf`: títulos, marca, números e CTAs de destaque.
- `Nunito.ttf`: corpo, metadados, labels e estados auxiliares.
- As imagens `assets/images/food/*` já eram byte-a-byte iguais às imagens de `pediu3/public/food/*`; não foram duplicadas.

## Portes fiéis

- Shell mobile-first centralizado no Web, com fundo externo ink e superfície interna creme.
- Home: localização, saudação, busca, ticker, stories circulares, promo reel, Relâmpago, Radar Flash, categorias com foto e cards de catálogo.
- Perfil: cabeçalho do usuário, Clube, Pediu Pay, nome, endereços, cupons, favoritos honestos/estado vazio, ajuda e navegação inferior escura.
- Navegação inferior: quatro itens `Início`, `Busca`, `Pedidos`, `Perfil`; o assistente permanece acessível pelo rail promocional e demais ações existentes.
- Animações: press/reveal/pulse do primitive compartilhado do Expo; sem mocks de saldo, pedidos, favoritos ou ofertas.

## Limites de dados

- O Pediu3 original tem dados locais de demonstração. Eles não são copiados para o caminho principal.
- `loyalty.me`, endereços, cupons, pedidos e catálogo usam tRPC/backend real do PR #9.
- Pediu Pay só mostra saldo/movimentações quando existir contrato persistido; não cria os valores demonstrados nos prints.
- Favoritos continuam como estado vazio até existir persistência de favoritos no backend.

## Verificação obrigatória

1. `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`.
2. Export Web Expo e preview em viewport móvel.
3. Console sem erros, sem overflow horizontal e rotas `/, /club, /market, /taste, /search` abrindo.
4. Repetir deployment smoke e stress read-only 120/12 contra a API do preview.

## Evidências desta rodada — 07/10/2026

- `pnpm check`, `pnpm test` (**51 arquivos / 254 testes**), `pnpm build`, `pnpm lint`, Prettier e `git diff --check`: aprovados.
- `npx expo export --platform web`: aprovado; **115 arquivos** exportados.
- Deployment smoke local e HTTPS temporário: `health=200`, `readyz=200`, marketplace `200`, CORS exato.
- Stress read-only `120` requisições / concorrência `12`: local p95 **63,7 ms**, HTTPS p95 **94,6 ms**, erro **0%** em ambos.
- Preview Expo Web: home, rail fotográfico, promo reel, Radar Flash, dock e perfil renderizados; console sem erros visíveis. Valores Club/Pay permanecem honestos quando não há sessão ou dado persistido.
