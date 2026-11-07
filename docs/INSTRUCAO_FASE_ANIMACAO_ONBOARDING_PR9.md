# Instrução Técnica — Transições suaves do onboarding do Pediu

## Objetivo

Refinar a experiência inicial das quatro telas de boas-vindas do Pediu com transições suaves entre etapas, preservando swipe, indicadores clicáveis, mascote contextualizado, acessibilidade e o gate persistente de primeiro acesso.

## Escopo

A mudança fica limitada a `app/onboarding.tsx` e aos testes/documentação da fase. A transição deve combinar o paging nativo do `FlatList` com uma entrada curta do conteúdo textual usando opacidade e deslocamento horizontal discreto. O mascote mantém seu pulso existente, sem aumentar a velocidade das falas ou introduzir ciclos contínuos.

## Regras de implementação

- Usar `Animated.timing` com duração curta, easing suave e deslocamento pequeno.
- Respeitar `customization.motionEnabled` e `useReducedMotion`; com movimento reduzido, o conteúdo deve aparecer imediatamente.
- Não animar propriedades de layout que provoquem reflow ou overflow; limitar a opacidade e `transform`.
- Interações por botão, swipe e dots devem compartilhar a mesma transição e não disparar efeitos duplicados perceptíveis.
- O botão `Continuar`, `Pular`, `Começar` e o gate persistente devem continuar funcionando sem esperar a animação.
- Não alterar autenticação, carrinho, pedidos, servidor ou persistência de domínio.

## Validação

1. Teste unitário existente do conteúdo e do gate de primeiro acesso.
2. `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` e `git diff --check`.
3. Sincronização Git → WebDev, restart do API/Metro e smoke de `/api/health`, `/api/readyz` e `/onboarding`.
4. Screenshot mobile do primeiro slide e inspeção de ausência de overflow/console error.
5. Checkpoint WebDev somente após todos os gates.
