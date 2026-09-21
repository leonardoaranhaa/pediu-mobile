# Fase G12 — Cotação server-side e carrinho completo

## Objetivo

Esta fase reforça a conexão vertical do carrinho com o backend. O aplicativo continuará permitindo que o usuário navegue e mantenha itens localmente, mas o checkout passará a consultar uma cotação autoritativa antes de exibir o valor final ou criar o pedido.

A cotação será baseada no catálogo persistido. O servidor verificará a loja, a abertura do estabelecimento, a disponibilidade dos produtos, os preços atuais e a taxa de entrega. O cliente não poderá usar o preço salvo no armazenamento local como autoridade financeira.

## Escopo desta entrega

O backend ganhará o contrato protegido `checkout.quote`. Ele receberá a loja e os produtos com suas quantidades e devolverá os itens recalculados, o subtotal, a taxa de entrega e o total. Produtos ausentes, indisponíveis, pertencentes a outra loja ou pedidos para uma loja fechada deverão produzir erros controlados.

O checkout dedicado consumirá essa cotação. A interface exibirá o estado de conferência, mostrará os valores recalculados pelo servidor, impedirá a confirmação enquanto a cotação estiver carregando ou inválida e enviará ao procedimento de criação de pedido o total e os preços retornados pela cotação.

O carrinho local continuará sendo responsável por navegação, quantidade, remoção, limpeza, persistência e regra de uma única loja. A taxa e o total exibidos antes do checkout continuarão sendo estimativas até que o servidor confirme a cotação.

## Regras de segurança

A cotação utilizará o catálogo do servidor e nunca confiará no preço enviado pelo cliente. A criação do pedido permanecerá como segunda validação obrigatória; a cotação não substituirá a transação de checkout nem a chave de idempotência.

Nenhum dado de cartão será armazenado pelo aplicativo. A fase não introduzirá cobrança externa nem alterará o modelo financeiro existente.

## Critérios de aceite

A fase será aceita quando um cliente autenticado conseguir abrir o checkout com o carrinho atual, consultar uma cotação real, visualizar subtotal, entrega e total server-side e confirmar o pedido somente quando a cotação estiver válida. Uma alteração de preço, indisponibilidade ou fechamento da loja deverá impedir a confirmação e exibir uma mensagem compreensível.

A suíte deverá cobrir o retorno de preços persistidos, o cálculo de subtotal e taxa, a rejeição de produto inválido ou indisponível e a integração do checkout com a cotação. Typecheck, testes, build, lint e validação operacional de migrations e API deverão permanecer verdes.

## Ordem de implementação

Primeiro será criado o contrato `checkout.quote` e sua função de cálculo server-side. Em seguida, o checkout consumirá esse contrato e substituirá os valores locais pelo snapshot retornado. Depois serão adicionados testes de contrato para preço autoritativo e estados inválidos. Por fim, o fluxo será validado no preview web e publicado no pull request.

## Limitações conhecidas

O login OAuth real ainda depende de `EXPO_PUBLIC_OAUTH_PORTAL_URL` e `EXPO_PUBLIC_APP_ID` no ambiente de preview. Sem essas variáveis, o checkout autenticado completo não poderá ser validado no navegador, embora a proteção de sessão e o bloqueio de visitante permaneçam testáveis.

## Referências

[1]: ./IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ./FASE_G11_PRODUTO_CARRINHO.md "Fase G11 de produto e carrinho global"
[3]: ./FASE_ENDERECOS_CHECKOUT_INTEGRACAO.md "Fase de endereços e checkout server-side"

## Implementação realizada — 2026-09-21

O router protegido `pediu.checkout.quote` foi adicionado. Ele consulta a loja persistida, verifica se o estabelecimento está aberto, carrega cada produto pelo identificador e pela loja autorizada, recalcula o preço atual, o subtotal, a taxa de entrega e o total. O preço armazenado no carrinho local não participa do cálculo autoritativo.

O checkout dedicado passou a consultar a cotação quando existe sessão e carrinho. Enquanto a cotação carrega, a confirmação permanece desabilitada. Quando o servidor rejeita um produto, uma loja fechada ou uma alteração de catálogo, a tela exibe o erro e oferece atualização do carrinho. Quando a cotação é válida, o pedido envia ao backend o total e os preços retornados pelo servidor, preservando endereço, método de pagamento e chave de idempotência.

Foram adicionados testes de contrato para preço e taxa server-side e para produto indisponível. A validação local terminou com **54 testes aprovados e 1 ignorado**, typecheck aprovado, build aprovado e lint sem erros. O lint mantém somente os avisos já existentes no aplicativo.
