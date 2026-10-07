# Instrução técnica — harmonização das funções originais no Pediu3 + PR #9

## Objetivo

Reintegrar ao shell visual fiel do Pediu3 as funções que já existiam na versão original do Pediu — especialmente assistente, mascote reativo, fala contextual, captura de voz, chat de suporte e atalhos operacionais — sem duplicar navegação, perder dados reais ou substituir os contratos já entregues no PR #9.

A branch de trabalho permanece `cursor/phase1-hybrid-ux-a9df`, baseada em `origin/main`. O backend atual, o banco MySQL, o `CartProvider`, autenticação, marketplace, Flash, Mercado, Taste, Club, checkout server-side, courier, pickup, tracking, pagamentos e console operacional continuam sendo a fonte de verdade.

## Regra de integração

1. **Preservar funcionalidade existente:** primeiro localizar e reutilizar `PediuMascot`, `mascot-scenes`, assistente/voz server-side, chat e preferências persistidas; não reimplementar contratos já existentes.
2. **Uma única camada visual:** o assistente e o mascote devem usar os tokens, `PediuMotion`, `PediuPressable`, `PediuCard` e tipografia Fredoka/Nunito da fase Pediu3.
3. **Sem mock no caminho funcional:** falas e cenas podem ser catálogo local de comportamento, mas saldo, pedidos, catálogo, localização, respostas de negócio e ações devem vir de tRPC/backend ou de estado persistido real.
4. **Sem duplicação:** haverá um launcher contextual do assistente e uma única instância do mascote por tela/árvore de navegação; nenhuma sobreposição permanente que desloque os cards do Pediu3.
5. **Acessibilidade e controle:** respeitar `motionEnabled`, reduced motion, fechamento explícito, foco/teclado no Web, safe area e retorno ao estado anterior.
6. **Ações allowlistadas:** voz e texto só podem disparar ações já autorizadas pelo backend; erros de autenticação, rede e intenção ambígua permanecem visíveis.

## Escopo funcional

### Assistente

- Reativar launcher flutuante compacto, visualmente coerente com o shell Pediu3.
- Abrir bottom sheet/modal de assistente sem overflow, com campo de texto, microfone quando disponível, estado de escuta, interpretação, resposta e erro.
- Reutilizar a interpretação server-side e as ações allowlistadas já existentes.
- Permitir atalhos reais para buscar produtos, abrir pedidos, abrir carrinho, consultar suporte e ações permitidas por perfil.
- Manter o mesmo assistente acessível para cliente, lojista e entregador quando o contexto/roteamento já permitir, sem copiar lógica de negócio para o cliente.

### Mascote

- Reintegrar `PediuMascot` em posição contextual, sem cobrir header, cards, dock ou teclado.
- Reutilizar cenas e falas de `mascot-scenes` com cooldown/debounce para evitar disparos rápidos.
- Reações mínimas obrigatórias: saudação/espera, produto adicionado ao carrinho, erro/atenção, checkout concluído e pedido em acompanhamento.
- Animações unificadas: olhos fechando, mãos cobrindo o rosto, pulso/respiração, felicidade e fome; todas interrompíveis e desligáveis.
- Balões discretos, limitados por largura e com fechamento automático determinístico.

### Outras funções originais

- Verificar e harmonizar suporte/chat, voz, temas, localização e personalização que já estejam implementados.
- Preservar telas de suporte e chat de pedido, preferências persistidas e ações de loja/anúncios.
- Não ativar capacidades externas não configuradas, como PSP/PIX homologado, OAuth adicional, push ou serviços de voz fora dos contratos existentes.

## Sequência de implementação

1. Auditar componentes, cenas, hooks, rotas, procedures e testes originais.
2. Definir contrato compartilhado de estado para launcher, sheet, mascote e eventos de reação.
3. Migrar o launcher e o sheet para o visual Pediu3 sem alterar ações server-side.
4. Reintegrar o mascote em uma única camada contextual da home e nos fluxos necessários.
5. Ligar eventos reais de carrinho, pedido, erro e navegação às cenas com cooldown.
6. Harmonizar as telas de suporte, conta, lojista e entregador onde houver assistente original.
7. Validar typecheck, testes focados, suíte completa, export Expo, preview Web, console, overflow e navegação.
8. Executar stress read-only e deployment smoke antes de publicar a fase no PR #9.

## Critérios de aceite

- Assistente abre, fecha e executa somente ações reais permitidas, sem modal primitivo ou overflow.
- Mascote aparece no máximo uma vez por composição, reage a eventos reais e não dispara falas em loop.
- A opção de reduzir/desativar movimento continua funcionando.
- Home mantém a hierarquia visual Pediu3 e o dock não é coberto.
- Cliente, lojista e entregador não perdem seus fluxos existentes.
- `pnpm check`, testes focados, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` passam.
- Preview Web e deployment smoke permanecem saudáveis; stress read-only 120/12 não apresenta regressão.

## Limites

Esta fase reintegra capacidades já existentes. Não cria um novo provedor de IA, não inventa dados de demonstração, não homologa pagamentos, não altera regras comerciais do backend e não publica/fecha o PR automaticamente antes dos gates finais.

## Implementação desta rodada

- O modal `VoiceAssistantModal`, interpretação server-side, transcrição nativa/Web e ações allowlistadas existentes foram preservados.
- Foi criado `components/pediu-companion.tsx`, com uma única camada visual acima do dock para o mascote contextual e o launcher do assistente.
- O home voltou a usar as preferências persistidas de `mascotEnabled`, `motionEnabled`, `showHints` e `mascotStyle`.
- As reações de carrinho e pedido usam os eventos reais já existentes; o retorno para fome/estado ambiente tem cooldown determinístico e cleanup no unmount.
- O companion é ocultado durante sheets/modais e no perfil, evitando duplicação, teclado coberto e colisão com checkout/carrinho.

## Evidências da rodada

- `pnpm check`: aprovado.
- `pnpm test`: **51 arquivos / 254 testes aprovados**.
- `pnpm build`: aprovado (`dist/index.js`, 338,8 kB).
- `pnpm lint`: aprovado; permanece somente o warning informativo de `MODULE_TYPELESS_PACKAGE_JSON` do ESLint.
- Prettier dos arquivos da fase e `git diff --check`: aprovados.
- `expo export --platform web`: aprovado com 62 rotas estáticas.
- Preview Expo Web: home carregou o mascote com fala e o botão `Abrir assistente do Pediu`; o sheet abriu com ações rápidas reais de cliente.
- Medição no viewport: overflow horizontal `0` na home e no sheet do assistente.
- Deployment smoke local: health 200, readyz 200, marketplace 200 e CORS exato.
- Stress read-only local: 120 requisições, concorrência 12, erro `0`, p95 `33,5 ms`.
- Deployment smoke HTTPS público autorizado: health 200, readyz 200, marketplace 200 e CORS exato.
- Stress read-only HTTPS público autorizado: 120 requisições, concorrência 12, erro `0`, p95 `80,5 ms`.
