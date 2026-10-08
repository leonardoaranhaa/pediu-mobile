# Instrução técnica — Assistente no dock inferior do Pediu

**Fase:** harmonização do assistente com a navegação Pediu3
**Projeto:** Pediu Mobile
**Branch:** `cursor/phase1-hybrid-ux-a9df`

## Objetivo

Colocar o acesso persistente ao assistente na barra de navegação inferior, mantendo o mascote como elemento contextual independente. A mudança deve preservar todas as ações de voz/texto, atalhos por perfil, interpretação server-side, transcrição nativa/Web, autenticação e navegação já existentes.

## Metodologia

1. Auditar a árvore atual para localizar o launcher absoluto, os docks de cliente/lojista e o `VoiceAssistantModal`.
2. Separar responsabilidades: `PediuMascotDock` renderiza somente o mascote; `AssistantNavItem` é o único launcher persistente do assistente.
3. Adicionar o item Assistente aos docks `CustomerNav` e `SellerNav`, mantendo as demais rotas e callbacks existentes.
4. Reutilizar `openVoiceAssistant`, `handleVoiceAction`, `handleVoiceCommand`, `toggleNativeRecording` e o modal existente, sem duplicar lógica de negócio no cliente.
5. Validar o caminho real no Expo Web: localizar o item, abrir o modal, conferir ações rápidas, fechar o modal, medir overflow e verificar console.
6. Executar typecheck, testes, build, export Expo e diff-check antes de publicar.

## Contratos preservados

- Cliente: buscar doces, consultar pedidos e abrir suporte continuam allowlistados.
- Lojista: registrar venda, consultar fiado, abrir catálogo e divulgar continuam ligados às mutations/rotas existentes.
- Voz: `voice.interpret` e `voice.transcribe` continuam server-side e com seus limites de segurança.
- Mascote: preferências de visibilidade, movimento, falas, cenas e reação permanecem independentes do launcher.
- Navegação: Descobrir, Busca, Pedidos, Perfil, Início, Catálogo, Clientes e Ajustes continuam acessíveis.

## Critérios de aceite

- Existe exatamente um launcher persistente `Abrir assistente do Pediu` no dock ativo.
- O arquivo do mascote não importa nem renderiza botão do assistente.
- O item Assistente abre o `VoiceAssistantModal` no modo correto do perfil.
- O modal abre, fecha e exibe os atalhos rápidos reais.
- O mascote não fica agrupado ao botão do assistente nem cobre o dock.
- O viewport não apresenta overflow horizontal.
- `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, export Expo, Prettier e `git diff --check` passam.
- O preview e os endpoints de deployment continuam saudáveis.

## Limites

Esta fase não cria novas ações de negócio, não altera o backend, não inventa dados de demonstração e não libera recursos de voz/IA externos. O acesso autenticado continua dependendo do OAuth real do ambiente.
