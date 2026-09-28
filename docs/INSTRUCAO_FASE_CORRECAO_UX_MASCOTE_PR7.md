# Instrução técnica — correção UX/UI, mascote e responsividade no PR #7

## Objetivo

Corrigir os bugs identificados no preview mobile do Pediu sem reintroduzir regressões na unificação UX/UI já publicada no PR #7. O escopo desta etapa é exclusivamente a camada Expo/React Native: comportamento visual do mascote, interação com navegação, customização persistida e overflow horizontal.

## Fonte da verdade e limites

- Branch obrigatória: `docs/go-live-plan`, PR #7.
- O backend, o fluxo courier, anúncios IA e as proteções do Go-Live não devem ser revertidos.
- PSP/PIX real, CNPJ, OAuth real, push externo, storage externo, EAS, dispositivos físicos e publicação nas lojas permanecem dependências externas pendentes.
- Não foram usados pagamentos reais, credenciais novas ou simulações de homologação.

## Problemas reproduzidos

1. A cena de privacidade dizia que o mascote cobria os olhos, mas as mãos ficavam nas laterais da face e não cobriam os dois olhos de forma perceptível.
2. O mascote recebia reações apenas de estados locais da home; mudanças de rota e de abas não alimentavam um estado contextual compartilhado.
3. O preview do mascote no estúdio de customização renderizava um balão sobre o texto em telas estreitas.
4. As opções de personalidade usavam dimensões flexíveis sem limite efetivo e podiam ultrapassar a largura útil.
5. Os orbes decorativos absolutos de `Page` (`right: -95` e `left: -115`) aumentavam o `scrollWidth` do documento web, causando overflow horizontal.

## Implementação

- Extração das cenas e do mapeamento de rotas para `lib/mascot-scenes.ts`, permitindo testes sem carregar módulos nativos do Expo.
- Reação contextual global no `AppPreferencesProvider`, com ponte `MascotNavigationBridge` no layout raiz.
- Reações de abas cliente/lojista conectadas às transições internas da home.
- Mãos do mascote ampliadas e reposicionadas sobre a face; fechamento dos olhos passou a ter progress próprio e animação temporizada.
- Estúdio de customização com largura máxima de 100%, `minWidth: 0`, padding proporcional, conteúdo rolável contido e três opções de personalidade limitadas a 31% da linha.
- Balão de fala removido somente do preview horizontal do modal; as cenas faladas continuam ativas na home e no perfil.
- `Page.root` passou a conter overflow dos elementos decorativos sem bloquear o scroll vertical.

## Evidências exigidas

- Regressão pura: `tests/mascot-behavior.test.ts` cobre `coverEyes`, barriga cheia e mapeamento de rotas.
- Teste visual headless em viewport `375x812` para `/` e `/account/settings`.
- Navegação real do preview para `/account/settings`, abertura do estúdio e navegação para `/account/profile`.
- Medição DOM antes/depois: antes `documentWidth=5216` para `innerWidth=5120` e `horizontalOverflow=true`; depois `documentWidth=5120` e `horizontalOverflow=false`. Os dois orbes continuam posicionados fora da área visual, mas não expandem mais o documento.
- Matriz local obrigatória: `pnpm test`, `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check`.
- Antes da publicação: deployment smoke real, stress read-only e preview público recompilado.

## Critério de aceite

A etapa só pode ser publicada se os testes locais permanecerem verdes, o preview público responder, a medição DOM não indicar overflow horizontal e os gates reais de deployment/stress concluírem sem erro. A etapa não fecha a Fase 7 de dispositivos físicos nem altera o estado de READY comercial.
