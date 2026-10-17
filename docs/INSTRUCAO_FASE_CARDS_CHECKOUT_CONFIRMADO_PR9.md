# Instrução Técnica — Cards de confirmação no checkout

## Objetivo

Adicionar ao checkout uma confirmação visual, curta e compreensível antes da criação do pedido, resumindo o prazo de entrega disponível e a regra real de cancelamento.

## Regras de fonte de verdade

- O prazo numérico só pode aparecer quando vier da cotação server-side, especialmente `flashEtaMaxMinutes` para pedidos Flash.
- No delivery padrão, não será inventado um número: a interface informará que o prazo depende do preparo da loja e da disponibilidade do entregador.
- Para retirada, a interface exibirá que não há taxa de entrega e que a loja avisará quando o pedido estiver pronto.
- A política visual de cancelamento refletirá `canCustomerCancelOrder`: o cliente pode cancelar em `Pendente` ou `Aceito`; depois que o pedido entrar em `Preparando`, o cancelamento pelo cliente deixa de ser permitido.
- A UI não promete refund, prazo financeiro ou reversão de pagamento que não tenha sido confirmado pelo PSP. O pedido e qualquer pagamento pendente continuam sendo tratados pelo servidor.

## Implementação

1. Criar copy pura testável para resumo de prazo e cancelamento.
2. Renderizar dois cards dentro do checkout: previsão/recebimento e cancelamento transparente.
3. Destacar Flash somente quando `quote.data.isFlash` for verdadeiro e o ETA vier da cotação.
4. Preservar o botão de confirmação, idempotência, total recalculado, estoque e criação server-side.
5. Cobrir a copy com Vitest e validar a tela via Expo Web/WebDev.

## Gates

Rodar o teste novo e a suíte completa com `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` e `git diff --check`. Depois sincronizar o clone oficial para `/home/ubuntu/pediu-app`, reiniciar API/Metro, validar `/api/health`, `/api/readyz`, rota de checkout, stress bounded de health e screenshot. Salvar checkpoint WebDev apenas com todos os gates verdes.
