# Fase de entregador, posição e ETA

## Objetivo

Implementar o próximo bloco vertical do Pediu para que uma entrega possa ser atribuída a um operador autorizado, receber posições idempotentes e apresentar ao cliente o entregador, a última posição conhecida, o ETA e o encerramento da entrega.

## Metodologia

A implementação seguirá uma conexão única entre persistência, contratos tRPC, operação da loja e acompanhamento do cliente. A autorização será derivada da sessão: somente o proprietário da loja poderá atribuir, atualizar a posição ou encerrar uma entrega; o cliente do pedido poderá consultar o estado da própria entrega.

Cada posição será armazenada com latitude, longitude, ETA e chave de idempotência. A chave impedirá duplicação quando o dispositivo repetir uma atualização por falha de rede. O histórico de eventos continuará sendo preservado, porque a posição atual não substitui a timeline operacional.

A interface operacional terá um fluxo controlado para iniciar uma entrega, informar a posição atual e finalizar a entrega. A interface do cliente atualizará a consulta periodicamente e exibirá estados de ausência de atribuição, ausência de posição, erro e entrega concluída.

## Critérios de aceite

A migration deverá aplicar em banco MySQL vazio. O backend deverá impedir acesso de outro cliente ou de outra loja. A repetição da mesma chave de localização deverá retornar o mesmo registro sem inserir uma segunda posição. O cliente deverá visualizar o nome do entregador, o ETA e a última posição somente para o próprio pedido. A entrega concluída deverá atualizar o pedido para `Entregue` e registrar o evento correspondente.

## Limitações explícitas

A posição automática depende das permissões de localização do dispositivo. A versão web terá entrada manual como fallback para testes e para ambientes sem geolocalização nativa. Não será declarado realtime por WebSocket nesta fase; a atualização será feita por polling curto e poderá evoluir para um canal realtime sem alterar o contrato persistido.

## Referências

[1]: ../docs/ROADMAP_EXECUCAO_UNIFICADA.md "Roadmap de execução unificada do Pediu"
[2]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"

## Implementação realizada

A migration `0017_delivery_assignments_locations.sql` criou a atribuição única por pedido e o histórico de posições com chave de idempotência. O backend passou a expor `pediu.experience.delivery.current`, `assign`, `location` e `complete`. A posição atualiza o ETA e inicia automaticamente o status `A caminho` quando o pedido estava em `Pronto`. A conclusão atualiza o pedido para `Entregue`, encerra a atribuição e registra o evento operacional.

A loja recebeu a rota `/seller/delivery`, que permite selecionar pedidos prontos, atribuir o operador, usar GPS ou coordenadas manuais, atualizar a posição e marcar a entrega como concluída. O cliente passou a visualizar entregador, telefone opcional, ETA e última posição na rota `/order/[orderId]/tracking-map`. A tela de acompanhamento ganhou uma entrada explícita para essa visualização.

## Evidências

Os cinco testes de contrato da fase passaram. O conjunto completo ficou com 67 testes aprovados e 1 ignorado. O typecheck, o build e o lint passaram; o lint emite apenas o aviso de módulo ESM já existente no `eslint.config.js`. As 18 migrations foram aplicadas em uma base MySQL vazia, incluindo as tabelas `pediu_delivery_assignments` e `pediu_delivery_locations` e suas restrições únicas.

No Expo Web, `/seller/delivery` abriu com o estado vazio correto para visitante, sem pedidos falsos. A rota `/order/101/tracking-map` abriu com os estados de ausência de atribuição e posição e com polling visível, sem erro de renderização.

## Referências

[1]: ../docs/ROADMAP_EXECUCAO_UNIFICADA.md "Roadmap de execução unificada do Pediu"
[2]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
