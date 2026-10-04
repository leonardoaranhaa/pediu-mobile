# Instrução técnica — unificação Pediu 2.0 + PR #7

## Objetivo

Unificar no aplicativo oficial do Pediu, no branch `docs/go-live-plan` e dentro do PR #7, a estética e as experiências úteis do workspace 2.0 com o backend e os fluxos reais já validados no PR #7.

A base de verdade continua sendo o PR #7. O workspace 2.0 será tratado como referência visual e de produto, não como fonte para substituir autenticação, banco, pagamentos, inventário, serviceability, despacho, tracking, rate limit ou outbox já implementados.

## Regra de integração

- Portar tokens visuais, composição, navegação, microinterações e componentes que sejam compatíveis com Expo/React Native.
- Reaproveitar assets de marca e alimentos somente após verificar licença/origem e tamanho; não copiar artefatos gerados, `node_modules`, `.vercel`, `.grok` ou banco/mock do workspace 2.0.
- Substituir dados estáticos do 2.0 por queries tRPC do PR #7, estados de loading/erro/vazio e contratos server-side.
- Preservar o fluxo OAuth, sessão Bearer/HttpOnly, cotação server-side, checkout idempotente, pickup/delivery, inventário, courier, tracking, notificações, rate limit e validações operacionais do PR #7.
- Não declarar login real, push, storage, PIX ou APK como concluídos sem as integrações externas e evidências correspondentes.

## Escopo vertical

1. Inventariar rotas, componentes, tokens, animações, assets e fluxos QA do workspace 2.0.
2. Mapear cada item para a tela/contrato correspondente no Expo oficial.
3. Implementar primeiro o shell visual mobile-first: paleta creme/vermelho/preto/amarelo, tipografia, cards, bottom navigation, barra de sacola, header de endereço e estados responsivos.
4. Portar experiências de cliente sem mockar dados: busca/categorias, stories/promos, Flash, restaurante/prato, endereço, sacola, checkout, club/vantagens, perfil, pedidos e tracking.
5. Preservar ou integrar os fluxos de lojista e entregador já existentes, evitando regressão visual e funcional.
6. Executar testes focados, TypeScript, build, lint, preview Web e, quando possível, bundle nativo/preflight.
7. Executar deployment smoke e stress antes de publicar a fase.

## Gates obrigatórios

- `pnpm check`
- testes Vitest completos e testes focados dos fluxos alterados
- `pnpm build`
- `pnpm lint`
- Prettier nos arquivos tocados e `git diff --check`
- preview Expo Web renderizado em viewport mobile sem overflow horizontal e sem erro de console
- health/readiness do backend quando o preview usar API
- deployment smoke e stress read-only do bundle final
- CI e Operational Validation verdes no PR #7
- worktree limpo e diff limitado à integração desta fase

## Limites externos

A fase não pode afirmar que resolveu dependências ainda ausentes: OAuth público, API/staging HTTPS permanente, `EXPO_TOKEN`, push/storage externos, PIX/Mercado Pago real, domínio, credenciais de produção e evidência em aparelho físico.

## Evidência e documentação

Após a implementação e os gates reais, atualizar este documento e acrescentar o próximo registro sequencial em `docs/GO_LIVE_PLAN.md`, descrevendo claramente o que foi portado, o que permanece externo e os resultados dos testes. Não publicar o registro antes de os gates passarem.

## Implementação concluída nesta rodada

- A referência visual foi integrada nativamente no Expo, sem copiar a infraestrutura web, mocks, `.grok`, `node_modules` ou assets sem origem verificável do workspace 2.0.
- A paleta principal agora usa creme `#FFF4E8`, vermelho `#E20D2A`, preto de tinta `#111111` e amarelo `#FFC400` em `lib/app-preferences.tsx`, `components/pediu-page.tsx`, `theme.config.js` e no manifest Expo.
- `components/pediu-v2-discovery.tsx` adiciona a camada de descoberta com hero, atalhos Pediu Agora, Radar Flash, central de avisos e empty/loading/error states.
- A home oficial recebeu a camada visual usando somente produtos, notificações, busca e mutações tRPC reais; não há catálogo demonstrativo hardcoded.
- O contrato de produto visual foi mantido estruturalmente compatível com o produto do marketplace, e o CTA de busca navega para a busca por cursor já publicada.
- Os timers dos workers internos receberam um guard portátil para manter `unref()` em Node sem quebrar a tipagem Expo/DOM.
- `.env.preview.example` documenta somente variáveis públicas; OAuth, API estável e `EXPO_TOKEN` continuam fora do repositório.

## Evidências reais executadas

| Validação                          | Resultado                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                         | `pnpm check` aprovado após o guard de timers                                                                              |
| Testes                             | 46 arquivos, 225 testes aprovados                                                                                         |
| Build backend                      | `pnpm build` aprovado; `dist/index.js` gerado                                                                             |
| Lint                               | `pnpm lint` aprovado; somente aviso de módulo ESM já existente                                                            |
| Formatação                         | Prettier dos arquivos tocados e `git diff --check` aprovados                                                              |
| Export Expo Web                    | 52 rotas estáticas exportadas, 11 MB em `/tmp/pediu-v2-export`, tokens 2.0 presentes no CSS/bundle                        |
| Preview visual mobile              | Chromium headless em 390×844; captura real sem clipping horizontal, hero/cards/nav legíveis                               |
| Console                            | Nenhum erro de console na inspeção do navegador; avisos nativos do Expo não bloqueantes                                   |
| API do preview                     | `/api/health` 200, `/api/readyz` 200 e `marketplace.search` 200; catálogo vazio é estado real do banco limpo de validação |
| Deployment smoke local             | Aprovado no backend `127.0.0.1:3000`: health, readyz e marketplace 200                                                    |
| Stress local read-only             | 120 requests / 12 workers; p50 22,0 ms; p95 60,5 ms; máximo 96,7 ms; erro 0%                                              |
| Deployment/stress HTTPS temporário | Smoke aprovado; 40 requests / 4 workers; p50 14,7 ms; p95 46,3 ms; máximo 130,0 ms; erro 0%                               |

## Limites que permanecem externos

O APK Android/iOS distribuível não foi declarado concluído: o build EAS exige `EXPO_TOKEN`, projeto EAS autenticado, API/OAuth HTTPS estáveis, credenciais de produção e validação em aparelho físico. Push/receipts, storage, PIX/Mercado Pago real, domínio/staging/produção, geocodificação/GPS em background e publicação nas lojas continuam pendentes. O preview HTTPS usado nesta fase é temporário do sandbox e não é staging/produção.
