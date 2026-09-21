# Fase G13 — Cupom server-side e confirmação de pedido

## Objetivo

Esta fase amplia o checkout já protegido pela cotação server-side. O cliente poderá informar um cupom, receber a validação do backend, visualizar o desconto autorizado e confirmar o pedido com o total líquido persistido no servidor.

A fase também torna a conclusão do checkout explícita. Depois da criação transacional, o usuário será direcionado para uma confirmação com o número do pedido, o valor final e a ação para acompanhar o status. O acompanhamento existente continuará sendo a fonte operacional do pedido.

## Escopo

O contrato de cotação aceitará um código opcional. O servidor deverá consultar o cupom normalizado, validar vigência, ativação, subtotal mínimo, tipo de desconto e limite máximo. A resposta deverá conter o código aplicado, o desconto autorizado e o total líquido.

O procedimento de criação de pedido repetirá a validação do cupom. O total recebido do cliente somente será aceito quando coincidir com o total recalculado pelo servidor. O pedido persistirá o código efetivamente aplicado e o desconto concedido para manter o histórico financeiro explicável.

A interface do checkout terá campo de cupom, ação de aplicar ou remover, estados de validação, mensagem de erro e resumo com subtotal, entrega, desconto e total. O botão de confirmação permanecerá desabilitado quando o cupom informado estiver inválido ou quando a cotação estiver ausente.

A tela de confirmação deverá mostrar o número do pedido, o total final, o método de pagamento e uma ação para abrir o acompanhamento. O fluxo não deverá mascarar falhas de criação nem declarar sucesso antes da resposta transacional do servidor.

## Regras de segurança

O valor do desconto nunca será calculado como autoridade no cliente. O frontend poderá enviar apenas o código. O backend consultará o cupom e repetirá a validação na criação do pedido.

A mesma chave de idempotência continuará protegendo retries. Uma tentativa repetida deverá retornar a operação existente sem aplicar o desconto novamente ou criar outro pagamento.

Nenhum dado completo de cartão será persistido pelo Pediu. Esta fase não altera o processamento externo de pagamentos.

## Critérios de aceite

A fase será aceita quando um cupom válido reduzir o total da cotação e do pedido, quando um cupom inválido impedir a confirmação com mensagem controlada e quando o pedido persistir o código e o desconto aplicado. Um pedido sem cupom deverá continuar funcionando com desconto zero.

A confirmação deverá ser exibida somente após uma criação bem-sucedida. O número e o total mostrados deverão vir da resposta do servidor. Os testes deverão cobrir validade, mínimo, limite máximo, cupom inválido, total adulterado e retry idempotente.

## Validação

A implementação deverá passar por typecheck, testes, build, lint, migrations em uma base MySQL vazia, smoke test da API e validação web. O checkout autenticado continuará condicionado à configuração OAuth do ambiente de preview.

## Referências

[1]: ./IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ./FASE_G12_COTACAO_CARRINHO_COMPLETO.md "Fase G12 de cotação server-side e carrinho"
[3]: ./FASE_ENDERECOS_CHECKOUT_INTEGRACAO.md "Fase de endereços e checkout server-side"

## Implementação realizada — 2026-09-21

A regra de cupom foi extraída para `server/domain/coupons.ts`, onde vigência, ativação, subtotal mínimo, percentual, valor fixo e limite máximo são calculados em centavos para evitar divergências de arredondamento. O contrato existente de validação passou a reutilizar essa regra.

A cotação `pediu.checkout.quote` agora aceita um código opcional e retorna o desconto autorizado, o código normalizado e o total líquido. O procedimento `pediu.orders.create` repete a validação e persiste `couponCode` e `discount` no pedido. A migration `0013_order_coupon_discount.sql` adiciona as duas colunas sem alterar o histórico de migrations anteriores.

O checkout ganhou campo de cupom, aplicação e remoção, mensagens de erro, linha de desconto no resumo e bloqueio da confirmação enquanto a cotação não estiver válida. Após a criação, a nova rota `/order/success` mostra o número do pedido e o total retornado pelo servidor antes de abrir o acompanhamento.

A validação local passou com **60 testes aprovados e 1 ignorado**, typecheck aprovado, build aprovado, lint sem erros e avisos preexistentes, além de 14 migrations aplicadas em uma base MySQL vazia com `couponCode` e `discount` confirmados em `pediu_orders`.
