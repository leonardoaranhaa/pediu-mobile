# Pediu — Máquinas de estado

## Pedido
`Pendente -> Aceito -> Preparando -> Pronto -> A caminho -> Entregue`

Cancelamento permitido antes de `Entregue`, sujeito às regras do estabelecimento/pagamento.

Nenhuma transição deve ser aceita apenas porque o app enviou o próximo status. O backend deve validar estado atual, ator autorizado e transição permitida.

## Pagamento
`pending -> authorized -> paid`

Falhas/cancelamentos/refundos são estados próprios e devem ser reconciliados por webhook quando o provedor suportar.

## Rastreamento
Um pedido em `A caminho` pode possuir:
- entregador atribuído;
- último ponto GPS;
- timestamp da posição;
- eventos de saída, chegada e conclusão.

A ausência temporária de GPS não deve apagar o último estado conhecido.

## Idempotência
Criação de pedido, criação de pagamento e processamento de webhook devem aceitar uma chave idempotente. Repetições não podem criar cobrança ou pedido duplicado.
