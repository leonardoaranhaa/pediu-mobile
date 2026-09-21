# Fase G — Modernização

## Objetivo
Elevar a experiência do Pediu sem reescrever páginas existentes.

## Camadas

1. Design system: tokens e componentes compartilhados.
2. UX states: loading, skeleton, empty, error e success.
3. Motion: entrada, saída, pressão, stagger e feedback.
4. Marketplace: descoberta, cards, catálogo e produto.
5. Checkout: feedback de etapas e pagamento.
6. Tracking: timeline, atualização e estados de entrega.
7. Chat: estados de envio, carregamento e mensagens.
8. Performance: renders, listas, cache e imagens.
9. Acessibilidade: labels, contraste, tamanho de toque e reduced motion.
10. Qualidade: TypeScript, lint, testes e build via CI antes do merge.

## Regra
A modernização deve ser incremental. Arquivos de tela existentes não são substituídos apenas para aplicar efeitos; componentes novos são adotados onde houver integração segura.
