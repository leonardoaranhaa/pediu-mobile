# Fase — Home inteligente, visibilidade por horário e configurações harmonizadas

**Projeto:** Pediu Mobile

**Branch de trabalho:** `cursor/phase1-hybrid-ux-a9df`

## Objetivo

Evoluir a home do Pediu para reconhecer o horário local do usuário e organizar a competição de visibilidade entre Mercado, padarias, restaurantes e fast-foods sem remover categorias nem transformar a home em um espaço exclusivo de uma vertical. A home deve apresentar o contexto mais útil para o momento do dia, manter acesso direto ao Pediu Mercado e preservar os contratos reais de catálogo, Flash, Taste, Club, carrinho, autenticação e pedidos.

A mesma fase recupera e harmoniza configurações que já existiam na versão original: tema, movimento, mascote, dicas, notificações, localização, privacidade, pagamento e preferências avançadas. A apresentação visual seguirá os tokens Fredoka/Nunito e os primitives de motion do Pediu3, sem transportar números ou ofertas mockadas.

## Regras de produto

- O horário é calculado no dispositivo usando a timezone local do usuário; nenhuma data local é persistida como verdade comercial.
- A prioridade de visibilidade é um ranking contextual, não uma exclusão: Mercado, padaria, almoço, café, jantar e Flash continuam acessíveis por rail, busca e rotas dedicadas.
- `isOpen`, disponibilidade, serviceability, estoque, Flash e preço continuam vindo do backend. A home nunca transforma o horário em uma promessa de funcionamento.
- A saudação é derivada de hora local, nome persistido quando houver e estado real do catálogo/endereço; quando não houver sessão ou endereço, a interface usa uma mensagem neutra.
- Animações ficam limitadas a `opacity` e `transform`, respeitam `motionEnabled` e reduced motion e não devem deslocar o layout ou cobrir o dock.
- Configurações persistidas por usuário continuam isoladas por `user.id`; preferências locais de visitante permanecem separadas até o login.

## Implementação planejada

1. Criar um domínio puro de período do dia e ranking contextual da home, com testes determinísticos por hora e timezone.
2. Conectar o domínio ao catálogo real da home e aos rails Mercado/Flash/padaria/restaurante, mantendo filtros backend e estados loading/empty/error.
3. Substituir saudação estática por saudação inteligente e atualizar o contexto periodicamente sem polling agressivo.
4. Aplicar reveal/press/pulse nos cards e rails sem duplicar loops Animated legados.
5. Tornar visíveis na área de configurações as preferências originais já persistidas e ligar cada opção ao comportamento correspondente.
6. Validar bundle, navegação, overflow, console, testes, deployment smoke e stress antes de publicar.

## Critérios de aceite

- A home mostra Mercado em horário comercial, padaria em janelas de manhã/tarde e fast-food/Flash em períodos noturnos quando houver dados elegíveis; nenhum bloco desaparece por falta de dados ou por regra client-side.
- A seleção de um card continua abrindo catálogo/produto/rota real.
- A saudação muda corretamente em manhã, tarde, noite e madrugada usando timezone local.
- As animações respeitam o toggle de movimento, não entram em loop acelerado e não criam overflow horizontal.
- Tema, mascote, movimento, dicas, notificações, localização, privacidade e preferências de pagamento continuam acessíveis e persistidos conforme os contratos existentes.
- `pnpm check`, testes focados, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` passam.
- Expo Web, API health/readiness, deployment smoke e stress read-only 120/12 permanecem verdes.

## Limites

Esta fase não cria horários fictícios de lojas, não publica ofertas inexistentes, não substitui o backend por heurísticas de cliente e não altera regras de pagamento ou serviceability. Caso a loja ainda não tenha metadados de horário persistidos, o ranking usa apenas o período do dia para ordenar o contexto visual e deixa a disponibilidade real para `isOpen` e marketplace.

## Implementação concluída

- `lib/home-context.ts` agora concentra períodos locais (`dawn`, `morning`, `lunch`, `afternoon`, `dinner`, `lateNight`), saudação, foco do momento e ranking estável de produtos. O ranking dá visibilidade contextual ao Mercado no horário de compras, à padaria/cafés de manhã e à tarde e ao Flash/restaurantes à noite, sem filtrar ofertas elegíveis nem substituir disponibilidade do servidor.
- A home atualiza o período local uma vez por minuto, usa a saudação contextual e mantém o card de contexto acionando rotas reais. O catálogo continua vindo de `pediu.marketplace.search` e mantém os rails Mercado/Flash/Taste.
- Os reveals de stories/categorias/ofertas respeitam `motionEnabled`; `PediuPressable` e `useReducedMotion` continuam responsáveis pelo feedback e pela acessibilidade de movimento.
- `AppCustomization` passou a persistir `smartHomeEnabled`, `analyticsEnabled`, `locationEnabled` e `diagnosticsEnabled`, com defaults compatíveis e isolamento por visitante/usuário já existente. A tela avançada deixou de usar `useState` efêmero e agora grava, restaura e navega para privacidade de verdade.
- Configurações expandidas preservam tema, mascote, movimento, dicas, notificações, endereços, Pediu Pay, segurança, privacidade e assistente. O reconhecimento automático de endereço só roda após opt-in de localização; o botão de localização continua disponível para ativação explícita.

## Evidências executadas em 2026-10-09

- `pnpm check`: aprovado.
- `pnpm vitest run tests/home-context.test.ts`: **10 testes aprovados**.
- `pnpm test`: **52 arquivos, 265 testes aprovados**.
- `pnpm build`: aprovado; bundle backend `dist/index.js` gerado.
- `pnpm lint`: aprovado; permanece apenas o aviso estrutural preexistente do `eslint.config.js` sobre `type: module` no `package.json`.
- Export Expo Web `/tmp/pediu-expo-home-inteligente`: aprovado; rotas `/`, `/account/settings` e `/account/settings/advanced` renderizadas.
- Preview Expo público: home renderizou saudação `Bom dia`, foco `Café e mercado`, rail fotográfico, card Mercado, Flash, assistente no dock e mascote separado; configurações avançadas exibiram todos os toggles persistidos.
- Medição no preview: `innerWidth=1280`, `documentScrollWidth=1280`, `overflow=false`, sem overflow horizontal.
- Deployment smoke local: health 200, readyz 200, marketplace 200 e CORS exato.
- Deployment smoke HTTPS público: health 200, readyz 200, marketplace 200 e CORS exato.
- Stress read-only local 120/12 final: erro `0.0000`, p50 `30.6 ms`, p95 `58.3 ms`, máximo `84.1 ms`.
- Stress read-only HTTPS 120/12 final: erro `0.0000`, p50 `30.0 ms`, p95 `91.8 ms`, máximo `221.1 ms`.

## Pendência consciente

O schema atual não possui ainda uma grade comercial de horários por loja. Portanto, o ranking client-side expressa o momento do usuário, enquanto `isOpen`, serviceability, estoque, preço, Flash e elegibilidade continuam exclusivamente no backend. A próxima evolução pode adicionar horários reais por loja e incorporar esses dados ao score sem alterar o contrato atual.
