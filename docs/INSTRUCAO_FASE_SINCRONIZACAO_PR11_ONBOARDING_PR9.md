# Instrução Técnica — Sincronização do PR #11 com o avanço do PR #9

## Objetivo
Avaliar e preparar a incorporação do PR #11 (`feat/onboarding-4-screens-swipe`) sobre o estado funcional atual do PR #9 (`cursor/phase1-hybrid-ux-a9df`), sem perder os fluxos reais de cliente, lojista, entregador, Mercado, Flash, Club, pagamentos, estoque ou o tema/mascote já integrados.

## Estado auditado em 11/10/2026

| Item | Resultado |
| --- | --- |
| PR avaliado | #11 — `feat/onboarding-4-screens-swipe` |
| Base do PR #11 | `main` em `d6eab62` |
| Estado do PR #9 | `9638404` — transições de tema e mascote |
| Diferença do PR #11 para `main` | 2 commits, 2 arquivos alterados |
| Arquivos funcionais | `app/onboarding.tsx` |
| Arquivo documental | `docs/PLAY_STORE_AND_ADS_PROMPTS.md` |
| Checks remotos | CI e Operational Validation verdes |
| Merge PR #11 sobre PR #9 | Limpo, sem conflitos |
| Validação do merge temporário | `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` e `git diff --check` verdes |
| Suíte no merge temporário | 55 arquivos, 271 testes aprovados |

## Conteúdo do PR #11

O PR substitui o onboarding de três telas por quatro telas com swipe horizontal, indicadores clicáveis, botão Continuar/Começar, ação Pular, mascote contextualizado por reação e leitura das preferências de tema/movimento do Pediu. A conclusão continua persistindo `pediu:onboarding-complete` e redirecionando para `/login`, portanto não altera contratos de autenticação ou backend.

O segundo arquivo contém briefing de textos e prompts de assets para Play Store, onboarding e Estúdio de Anúncios. Ele não adiciona imagens, segredos, migrations, rotas de backend ou dependências externas.

## Viabilidade

A incorporação é **viável e de baixo risco técnico**. A aplicação real do merge do branch do PR #11 sobre o branch do PR #9 foi executada em worktree temporário e não produziu conflito. Os gates locais completos passaram. O PR #11 não toca nos contratos server-side, schema Drizzle, checkout, pagamentos, estoque, courier, Mercado, Flash, Club, notificações ou preferências persistidas.

## Pontos de atenção antes de publicar

1. O PR #11 usa `Dimensions.get("window")` em vez de `useWindowDimensions`; deve ser validado em rotação, web responsivo e dispositivos com notch.
2. O onboarding usa `Animated.spring`; deve respeitar `customization.motionEnabled` e preferência de movimento reduzido antes do release final, pois o restante do app já possui esse contrato.
3. O indicador usa `PEDIU.line` em vez do token de linha da paleta efetiva; no modo escuro pode haver contraste menor.
4. `FlatList.scrollToIndex` deve ser validado em swipe rápido e nos quatro indicadores, evitando índice visual divergente.
5. O comportamento atual de persistir onboarding e ir para `/login` foi preservado; não há guard global que force a tela automaticamente. Isso deve ser confirmado como comportamento desejado no fluxo de lançamento.

## Procedimento recomendado

1. Manter o PR #11 aberto para revisão independente ou, se a decisão for unificar agora, incorporar seus dois commits no branch do PR #9.
2. Preferir merge/cherry-pick dos commits `9fc971f` e `d0e6601` no branch `cursor/phase1-hybrid-ux-a9df`; não fazer reset do branch e não alterar PRs antigos.
3. Corrigir os pontos de atenção de acessibilidade/movimento no branch integrado antes do checkpoint.
4. Rodar novamente a matriz completa e smoke real da API.
5. Sincronizar o branch integrado com `/home/ubuntu/pediu-app` usando `scripts/sync-to-webdev.sh`, sem copiar `.env*`, `.git`, `node_modules`, `android`, `dist` ou caches.
6. Reiniciar o WebDev, validar Metro/API, testar onboarding em web e mobile viewport, salvar checkpoint somente após a validação.
7. Manter EAS/Play separados; este PR não autoriza build, submissão ou publicação.

## Execução autorizada

O usuário autorizou a incorporação. O PR #11 foi integrado no branch `cursor/phase1-hybrid-ux-a9df` por merge sem conflitos. Também foram aplicados os ajustes recomendados: `useWindowDimensions`, fallback de 375 px para o primeiro paint SSR/hidratação, respeito a `motionEnabled` e movimento reduzido, troca de `spring` por `timing`, token `theme.line` para o indicador e extração/teste do conteúdo puro das quatro etapas.

A sincronização com o workspace WebDev e o checkpoint ficam condicionados à aprovação dos gates completos desta fase. EAS, Google Play e qualquer credencial externa permanecem fora do escopo.
