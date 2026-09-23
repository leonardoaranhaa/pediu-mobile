# Fase de comunicação transacional e notificações

## Objetivo

Completar o bloco de comunicação do Pediu com mensagens de pedido idempotentes, participação autorizada da loja, leitura de mensagens e preferências persistentes de notificações. Os avisos deverão carregar uma rota interna opcional para que a interface abra o pedido ou o suporte correto.

## Metodologia

O servidor continuará sendo a autoridade sobre participantes e recursos. O cliente poderá listar mensagens somente quando for cliente do pedido ou proprietário da loja associada. A loja poderá responder no chat usando um papel controlado pelo servidor; o cliente continuará identificado como cliente. A chave de idempotência será obrigatória para novas mensagens e repetição da mesma chave deverá devolver a mensagem já criada.

As preferências serão persistidas por usuário e consultadas antes do envio de notificações transacionais. O registro da notificação permanecerá disponível mesmo quando o push estiver desabilitado, porque a central interna precisa preservar o histórico. A rota de ação será validada pelo servidor a partir de dados internos do evento e não de uma URL arbitrária enviada pelo cliente.

A interface de notificações exibirá estados de carregamento, vazio e erro. O toque em uma notificação marcará o registro como lido e abrirá a rota interna quando existir. A tela de chat manterá polling curto, controle de envio e leitura explícita.

## Critérios de aceite

A migration deverá aplicar em banco MySQL vazio. Mensagens repetidas com a mesma chave não poderão criar duplicatas. Um usuário de outra loja não poderá ler ou escrever no chat. Preferências deverão ser atualizadas somente pelo próprio usuário. Notificações de pedido deverão continuar sendo persistidas e deverão aceitar uma ação interna de acompanhamento.

## Limitações explícitas

Esta fase mantém polling em vez de WebSocket. O push nativo depende de token e credenciais do dispositivo; a central interna não depende desse serviço. A abertura de rotas funciona no app e no Expo Web por meio de caminhos internos.

## Referências

[1]: ../docs/ROADMAP_EXECUCAO_UNIFICADA.md "Roadmap de execução unificada do Pediu"
[2]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"

## Implementação realizada

A migration `0018_communication_preferences.sql` adicionou chave de idempotência e leitura às mensagens, rota interna opcional às notificações e uma tabela única de preferências por usuário. O chat passou a autorizar cliente e proprietário da loja, aceitar respostas da loja, marcar mensagens como lidas e devolver a mensagem existente quando uma chave é repetida. A criação também trata corrida concorrente causada por retries simultâneos.

A central de notificações passou a carregar e alterar preferências de atualizações de pedidos, mensagens de suporte, promoções e push no dispositivo. O serviço de push persiste sempre a notificação interna, aplica as preferências somente ao envio externo e deriva deep links internos para pedido ou acompanhamento de entrega.

A interface de notificações apresenta preferências, histórico, estados de erro e abertura de ação interna. A interface de chat apresenta polling, leitura, retry seguro e bloqueio explícito para visitantes sem sessão.

## Evidências

A suíte completa passou com 71 testes aprovados e 1 ignorado. Typecheck, build, lint e `git diff --check` passaram. As 19 migrations foram aplicadas em uma base MySQL vazia; a migration 0018 criou `pediu_notification_preferences`, `actionPath`, `readAt` e o índice único da chave de chat.

No Expo Web, a central `/account/notifications` abriu com o estado visitante correto. A rota `/order/101/chat` inicialmente revelou que o input era exibido antes da autenticação; isso foi corrigido e a nova verificação mostrou apenas a mensagem de acesso privado, sem campo de envio.

## Referências

[1]: ../docs/ROADMAP_EXECUCAO_UNIFICADA.md "Roadmap de execução unificada do Pediu"
[2]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
