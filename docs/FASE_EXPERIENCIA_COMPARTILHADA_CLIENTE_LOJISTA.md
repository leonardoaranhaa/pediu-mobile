# Fase de experiência compartilhada entre cliente e lojista

## Objetivo

Garantir que o cliente e o lojista tenham acesso às mesmas melhorias de interface, personalização visual e assistente, sem misturar os dados operacionais de cada papel.

## Metodologia

A personalização será extraída para um componente compartilhado e usada nas configurações de conta e da loja. O tema continuará persistente no dispositivo nesta etapa, enquanto perfil, pedidos, catálogo, vendas e entregas permanecem isolados por usuário/loja no backend. A entrada do assistente será disponibilizada para os dois modos por uma rota controlada, preservando o modo lojista.

## Critérios de aceite

- Cliente e lojista conseguem abrir a mesma tela de seleção de temas.
- A troca de tema reflete nos dois modos sem recarregar o app.
- O lojista consegue acessar o assistente no modo seller.
- Dados comerciais do lojista não aparecem no perfil cliente e dados do cliente não aparecem nas consultas da loja.

A validação incluirá typecheck, testes, build, lint e smoke test das rotas de conta, loja e home.
