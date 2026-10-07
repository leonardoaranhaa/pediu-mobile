# Instrução técnica — unificação visual Pediu3 + PR #9

## Objetivo

Transferir para o aplicativo Expo atual a linguagem visual do repositório [`leonardoaranhaa/pediu3`](https://github.com/leonardoaranhaa/pediu3), preservando integralmente os contratos reais já entregues no PR #9: autenticação, marketplace, Flash, Mercado, Sabor, Club, carrinho, cotação server-side, checkout, pagamentos, inventário, pickup, courier, tracking, gorjetas, tip settlements, console admin e persistência MySQL.

A branch de trabalho é `cursor/phase1-hybrid-ux-a9df`, baseada em `origin/main`, com head atual `d8eb500`.

## Fontes auditadas

- Fonte visual: `pediu3@520fbc0`, aplicativo web mobile-first com tokens creme/vermelho/preto/amarelo, cards elevados, shell flutuante, promo rails, stories, radar Flash, modais bottom-sheet e animações Motion/CSS.
- Fonte funcional: `pediu-mobile@d8eb500`, Expo SDK 54 + React Native + Expo Router + tRPC + Express + Drizzle/MySQL.
- Assets de alimentação do Pediu3 e do atual foram comparados por SHA-256 e já são idênticos; não copiar duplicatas nem os artefatos `.grok`, `.vercel`, mocks, banco ou `node_modules`.

## Regra de integração

1. **O backend atual é a fonte de verdade.** Nenhum dado, preço, taxa, disponibilidade, total, cupom, status ou métrica do Pediu3 será transplantado para produção.
2. **A aparência será portada nativamente.** Recriar em React Native componentes equivalentes aos cards, promoções, stories, radar, shell, bottom navigation, cart peek, badges, sheets e microinterações.
3. **Uma camada única de movimento.** Criar primitives compartilhadas para entrada escalonada, press feedback, pulse, floating, cart-pop e transições de sheet. Usar `react-native-reanimated` já instalado no Expo, respeitar `motionEnabled`, acessibilidade e fallback sem movimento.
4. **Cards unificados.** Cards de loja/produto/promo/operacional usarão tokens compartilhados, imagem com overlay, badges Flash/Mercado, metadados e estados loading/erro/vazio. O CTA continuará navegando para as rotas Expo reais.
5. **Sem regressão funcional.** Não substituir `trpc`, `useAuth`, `useAppPreferences`, `CartProvider`, `ScreenContainer`, `Page`, `Card`, rotas Expo ou validações server-side por estado local/mock do Pediu3.
6. **Responsive e seguro.** Todas as telas continuarão mobile-first, sem overflow horizontal, com `ScrollView`/`FlatList` apropriado, safe areas, texto truncado e fallback para web.
7. **Performance.** Evitar loops infinitos por tela, re-render de objetos de estilo em listas e animações no JS thread quando houver equivalente nativo. Pausar movimento fora da tela e respeitar reduced motion/preferência do usuário.

## Escopo de implementação

### Camada compartilhada

- Expandir tokens visuais para incluir `surfaceElevated`, `surfaceMuted`, `accent`, `inkForeground`, sombras e raios do Pediu3 sem quebrar os três temas persistidos.
- Criar primitives `PediuMotion`, `PediuPressable`, `PediuStagger`, `PediuFloating` e `PediuCard`.
- Evoluir `Page`, `Card`, `PrimaryButton`, `Row` e `CartPeek` para consumir a camada única.

### Experiência do cliente

- Home: header de localização/avisos, busca pill, rail fotográfico, promo cards, Radar Flash, categorias, coleção em destaque, filtros e cards reais do marketplace.
- Busca, loja, produto, Mercado, Flash, Sabor, Club, cupons e perfil: mesma hierarquia visual, badges, sheets e estados de dados reais.
- Carrinho, checkout, pedidos e tracking: cards e transições mais sofisticados sem alterar quote, fulfillment, tip, cupom, pagamento ou idempotência.

### Operação

- Aplicar a mesma linguagem aos painéis de lojista, entregador e admin: cards de KPI, status pills, listas operacionais, Flash/tips e sheets.
- Não esconder estados de erro, autorização, loading ou feature flags (inclusive Pediu Junto desativado).

## Entrega visual portado do Pediu3

A home Expo agora usa a composição nativa equivalente aos blocos visuais do Pediu3, sem importar dados estáticos do repositório-fonte:

- `PediuMotion`, `PediuPressable`, `PediuPulse`, `PediuReveal`, `PediuCard` e tokens compartilhados para o movimento e superfícies.
- Shell com dock flutuante e `CartPeek` alimentado por `CartProvider` persistido; o peek não aparece sem itens e navega para `/cart`. O mascote continua disponível na personalização e em fluxos reativos, mas não é sobreposto à home fiel do Pediu3, que não o exibe nos prints de referência.
- Ticker Flash alimentado pela resposta `marketplace.search`, banner de pedido ativo alimentado por `orders.mine` e CTA direto para `/order/track`.
- Promo reel com autoavanço e ações reais para assistente, cupons, Mercado, pedidos e busca; rail “Ofertas que correm” filtrado por `flashEnabled`/anúncio persistido e com preço vindo do backend.
- Stories com progresso, toque anterior/próximo, timeout determinístico e CTA “Pedir agora” para o produto real; o viewer é full-screen e não usa o catálogo mockado do Pediu3.
- Estados vazios, loading, erro, cards de produto e tiles de descoberta usam o mesmo tratamento visual, mantendo os handlers e temas persistidos do app atual.

## Rodada de fidelidade visual — 07/10/2026

- A home foi ajustada para a hierarquia dos prints: localização, saudação, busca pill, ticker, rail fotográfico, promo reel vermelho/ink, tiles “O que pedir?”/“Mercado Flash”, Radar Flash, CTA de busca, categorias e dock inferior.
- O perfil da aba passou a reproduzir a composição do Pediu3 com cabeçalho do usuário, Club, Pediu Pay sem saldo inventado, nome, endereços, cupons, favoritos, ajuda e ações de autenticação/lojista. Club, endereços e cupons continuam alimentados por tRPC; quando não há dado real, a UI mostra estado vazio ou `—`.
- O rail visual vazio usa somente assets locais e rótulos de categoria, e cada toque chama o filtro real da home (`__flash__` ou categoria persistida); não cria lojas, preços, ratings ou cupons falsos.
- O preview Web confirmou a nova tela de perfil sem overflow horizontal (`scrollWidth` não excede o viewport) e a home sem overlay do mascote. O console permaneceu sem erros de runtime.
- Gates finais executados em 07/10/2026: `pnpm check`, `pnpm test` (**51 arquivos / 254 testes**), `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados; export Web Expo aprovado com **115 arquivos**.
- Deployment smoke aprovado localmente e por HTTPS temporário (`health=200`, `readyz=200`, marketplace `200`, CORS exato). Stress read-only **120/12** aprovado localmente (p95 **63,7 ms**, 0% erro) e por HTTPS (p95 **94,6 ms**, 0% erro).

Em 06/10/2026, o preview público revelou que o banco usado pelo servidor ainda estava em 33 migrations; a chamada de marketplace retornava HTTP 500 por causa das colunas Mercado ausentes. As migrations aditivas 0034/0035 foram aplicadas nesse banco de preview, que passou a reportar 36 migrations e o endpoint público voltou a responder HTTP 200. O catálogo vazio atual é um estado real do banco, não um mock de fallback.

## Sequência obrigatória

1. Criar tokens e primitives compartilhados.
2. Migrar `Page`/`Card`/botões/cart peek e home/discovery.
3. Migrar cards e telas cliente de maior tráfego.
4. Migrar checkout, pedidos/tracking e áreas operacionais.
5. Rodar gates focados e visualizar o Expo Web em viewport móvel.
6. Corrigir overflow, console errors, regressões de navegação e performance.
7. Rodar matriz completa, build de produção, deployment smoke e stress antes de publicar.

## Critérios de aceite

- Nenhum mock do Pediu3 é usado no caminho de dados do app atual.
- Todas as rotas principais continuam carregando e cada ação mantém seu handler real.
- Cards possuem estados pressionado, loading/vazio/erro, badge contextual e feedback de toque.
- Animações são determinísticas, interrompíveis, não duplicadas e desativáveis.
- Preview Expo Web em viewport 390×844 sem overflow horizontal, tela branca ou erro de console.
- `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` passam.
- Deployment smoke/readiness e stress read-only são executados na build final.

## Evidências desta rodada

- Expo export web: concluído; bundle JavaScript de 3.485.817 bytes, aproximadamente 885.826 bytes gzip.
- Preview público: home, `/flash`, `/market`, `/taste` e `/club` carregaram sem erro de console; a home reportou `scrollWidth === viewport`.
- Qualidade: `pnpm check`, `pnpm test` (51 arquivos/254 testes), `pnpm build`, `pnpm lint`, Prettier dos arquivos alterados e `git diff --check` passaram.
- Deployment smoke HTTPS: health 200, readyz 200, marketplace 200 e CORS exato.
- Stress read-only: local 120 requisições/concurrency 12, p95 36,4 ms, erro 0%; HTTPS 120/concurrency 12, p95 78,8 ms, erro 0%.
- Readiness: 4 checks PASS, nenhum BLOCKED; PSP/PIX, OAuth, e-mail, storage, push, backup/restore, dispositivos e observabilidade continuam corretamente `NOT_CONFIGURED`.

## Limites externos

Esta fase não homologa PSP/PIX, OAuth, push, storage, EAS ou publicação nas lojas. O preview HTTPS do sandbox não é staging/produção. A sofisticação visual não pode ser apresentada como evidência de integração externa.

## Registro inicial da auditoria

- `pediu3@520fbc0` contém a referência visual mais sofisticada: tokens, `fade-up`, `cart-pop`, `floaty`, `pulse-ring`, radar, stories, promo reel, cards de restaurante, shell flutuante e sheets.
- O Expo atual já possui `PediuV2Discovery`, `PediuMascot`, `Page`, `Card`, `ProductCard`, `DiscoveryTiles` e `CartPeek`, mas as animações estão distribuídas entre `Animated` legado e estilos locais.
- A migração deve consolidar essas capacidades em uma camada compartilhada, não duplicar o mascote nem criar uma segunda navegação.
