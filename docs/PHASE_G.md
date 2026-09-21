# Fase G — Modernização do Pediu

A modernização é incremental e não reescreve telas existentes. Novas superfícies devem reutilizar os primitives abaixo; telas existentes só serão tocadas em uma revisão posterior e explícita.

## Primitives

- `components/pediu-page.tsx`: tokens, tipografia e componentes base.
- `components/pediu-motion.tsx`: FadeIn, PressScale, Pulse e Skeleton.
- `components/pediu-feedback.tsx`: loading, empty e error states.

## Princípios

1. Microinterações devem comunicar causa/resultado, não decorar.
2. Animações usam `useNativeDriver` quando aplicável.
3. Estados assíncronos sempre têm feedback visível.
4. Interações críticas devem permanecer acessíveis e legíveis sem animação.
5. Backend continua como autoridade para preço, disponibilidade, taxas, totais e status.
6. Não duplicar design systems nem substituir componentes existentes sem necessidade.

## Sequência G

G1 Design primitives → G2 estados → G3 microinterações → G4 marketplace → G5 checkout → G6 tracking → G7 chat/suporte → G8 performance → G9 arquitetura → G10 revisão visual/acessibilidade.
