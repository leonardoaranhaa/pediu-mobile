# Instrução Técnica: Transições de Tema e Estilo do Mascote (PR #9)

## Objetivo
Adicionar animações suaves e controladas para:

- alternância entre modo claro e escuro;
- troca entre as paletas Pediu original, Onda local e Pôr do sol;
- mudança de personalidade visual do mascote;
- abertura e fechamento do estúdio de personalização.

## Escopo
1. Expor o modo claro/escuro na central de personalização sem remover as três paletas do Pediu.
2. Persistir a escolha localmente com AsyncStorage; nenhum segredo ou valor privado vai para o cliente.
3. Animar a troca global com um overlay de crossfade usando `useNativeDriver`, sem travar interação e sem montar um segundo navegador.
4. Derivar a paleta atual do Pediu a partir da paleta escolhida e do modo global, mantendo os tokens existentes.
5. Animar a entrada do mascote quando `mascotStyle` muda, sem alterar suas reações, falas, acessibilidade ou timers de cenas.
6. Respeitar `motionEnabled` e `useReducedMotion`; quando movimento estiver desligado, a troca deve ser instantânea e estável.

## Limites de UX
- Duração de troca global: aproximadamente 240–320 ms.
- Duração de seleção do mascote: aproximadamente 240–300 ms.
- Sem bounce exagerado, escalas abaixo de 0,96 ou loops adicionais.
- Overlay com `pointerEvents="none"` para não bloquear o app.
- A animação não pode alterar contratos de autenticação, checkout, pagamentos, estoque, entregas, notificações ou persistência de conta.

## Arquivos principais
- `lib/theme-provider.tsx`: modo claro/escuro, persistência e crossfade global.
- `lib/app-preferences-core.ts`: variantes de paleta e derivação light/dark.
- `lib/app-preferences.tsx`: integração do modo global ao tema visual do Pediu.
- `components/theme-picker.tsx`: seletor de modo e transições do estúdio.
- `components/pediu-mascot.tsx`: entrada suave na troca de estilo.
- `tests/theme-preferences.test.ts`: contratos puros de paleta e modo.

## Validação
1. `pnpm check`
2. `pnpm test`
3. `pnpm build`
4. `pnpm lint`
5. `git diff --check`
6. Sincronizar Git → WebDev excluindo segredos e artefatos.
7. `webdev_restart_server` e `webdev_check_status`.
8. Testar `GET /api/health` e `GET /api/readyz`.
9. Capturar preview da central de configurações em modo claro e escuro.
10. Alternar as três paletas e os três estilos do mascote, verificando ausência de overflow e de console error.
11. Validar `motionEnabled=false` e preferência de movimento reduzido.
12. Salvar checkpoint WebDev apenas após todos os gates verdes.

## Rollback
- Reverter o checkpoint WebDev da fase anterior se a animação causar regressão visual.
- O clone Git continua sendo a fonte de verdade.
- Nenhuma migration de banco é necessária.
