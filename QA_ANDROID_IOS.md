# Auditoria de experiência Android x iOS — Pediu

## Escopo

A auditoria foi realizada sobre o fluxo principal esperado de um aplicativo de pedidos de comida: descoberta, detalhe do produto, inclusão no carrinho, checkout, endereço, pagamento, confirmação e acompanhamento. Também foram revisados os pontos nativos de localização, microfone, notificações, teclado, safe area e botão de voltar.

## Resultado da rodada

| Fluxo | Android | iOS | Resultado |
|---|---|---|---|
| Abrir o app e descobrir produtos | Preview validado | Preview validado | Aprovado |
| Abrir detalhe de produto | Preview validado | Mesmo componente React Native | Aprovado |
| Adicionar produto ao carrinho | Preview validado com toast e contador | Mesmo componente React Native | Aprovado |
| Total do carrinho | Corrigido para soma real dos preços | Corrigido para soma real dos preços | Aprovado em código e testes |
| Exigir autenticação antes do pedido | Fluxo encaminha ao login | Fluxo encaminha ao login | Aprovado |
| Informar endereço de entrega | Checkout implementado com teclado adaptativo | Checkout implementado com comportamento `padding` | Aprovado em build; requer aparelho físico |
| Selecionar PIX, cartão ou dinheiro | UI implementada e forma persistida no pedido | UI implementada e forma persistida no pedido | Aprovado em build |
| Criar pedido persistente | tRPC + banco conectados | Mesmo fluxo nativo | Aprovado em build; requer sessão válida para E2E |
| Acompanhar status | Tela existente com progresso | Mesmo fluxo nativo | Parcial: status ainda demonstrativo |
| GPS | Permissão e leitura de localização configuradas | Permissão e leitura de localização configuradas | Requer teste físico |
| Microfone e transcrição | Gravador Expo configurado | Gravador Expo configurado | Requer build EAS e permissão real |
| Push notifications | Canal Expo configurado | Configuração Expo existente | Requer tokens e aparelho físico |
| Safe area e navegação inferior | Safe area e edge-to-edge Android configurados | Safe area iOS configurada | Revisado em código |
| Teclado no checkout | `KeyboardAvoidingView` com `height` | `KeyboardAvoidingView` com `padding` | Implementado |
| Voltar/fechar modais | `onRequestClose` configurado | `onRequestClose` configurado | Revisado em código |

## Correções realizadas nesta rodada

O checkout deixou de ser simulado. O carrinho agora calcula o total a partir dos itens, exige autenticação antes de avançar, solicita endereço de entrega, permite selecionar PIX, cartão ou dinheiro e cria o pedido e o registro de pagamento no backend. O comportamento do teclado foi adaptado por plataforma para evitar que o campo de endereço fique escondido.

Também foram adicionadas regras puras e testes para cálculo de preços brasileiros e total do carrinho. A suíte atual passou com **7 testes aprovados e 1 teste de autenticação ignorado por depender de sessão externa**. O TypeScript e o export web passaram.

## Limitações honestas

Não há simulador Android/iOS disponível nesta sessão e não foi possível concluir um teste físico sem autenticação do EAS e instalação de um build nos aparelhos. Portanto, a matriz separa o que foi validado por código/preview do que precisa ser confirmado em dispositivo real. O próximo teste físico deve cobrir permissões negadas, GPS desligado, microfone negado, teclado aberto no checkout, botão voltar e push em segundo plano.

## Lacunas ainda prioritárias

O acompanhamento do pedido ainda usa alguns dados demonstrativos e precisa ser conectado a pedidos reais e atualização por polling ou push. Também falta conectar o gateway PIX escolhido antes de considerar pagamentos online prontos para produção. Por fim, o catálogo precisa evoluir para quantidade, adicionais, observações e taxa de entrega por loja.
