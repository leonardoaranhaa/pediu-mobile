# Fase de conta real, privacidade e pagamentos

## Objetivo

Substituir os controles locais de conta por operações persistentes de perfil, preferências de pagamento e privacidade. A fase deverá permitir que o usuário atualize dados básicos, consulte preferências de pagamento, exporte um resumo dos próprios dados e solicite exclusão assistida sem apagar registros financeiros automaticamente.

## Metodologia

A autorização será derivada da sessão e todos os dados serão filtrados pelo identificador do usuário. O perfil atualizará apenas nome e e-mail, preservando `openId`, papel e histórico de autenticação. As preferências de pagamento serão armazenadas separadamente dos pagamentos efetivamente realizados; elas indicam disponibilidade e preferência da interface, não autorizam uma cobrança.

A exportação retornará um pacote estruturado com perfil, endereços, pedidos, notificações, consentimentos e chamados do próprio usuário. A solicitação de exclusão criará um chamado auditável. Esta etapa não executará exclusão imediata, porque pedidos e registros financeiros podem possuir retenção legal.

## Critérios de aceite

A migration deverá aplicar em banco MySQL vazio. Um usuário não poderá ler ou alterar perfil, preferências ou exportação de outro usuário. A tela de pagamentos deverá refletir os valores persistidos depois de recarregar. A tela de privacidade deverá permitir exportar os dados e abrir uma solicitação de exclusão assistida.

## Limitações explícitas

O pacote de exportação será retornado pela API para a interface; o download de arquivo poderá ser adicionado depois. A exclusão assistida será um pedido de atendimento, não uma operação destrutiva automática. Nenhum dado de cartão será armazenado nesta fase.

## Referências

[1]: ../docs/ROADMAP_EXECUCAO_UNIFICADA.md "Roadmap de execução unificada do Pediu"
[2]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"

## Implementação realizada

A migration `0019_customer_payment_preferences.sql` criou preferências persistentes de PIX, cartão e dinheiro por usuário. O backend passou a expor perfil, preferências de pagamento, exportação de dados e solicitação de exclusão assistida. O perfil atualiza apenas nome e e-mail; o papel e o identificador de login permanecem protegidos.

A exportação reúne perfil, endereços, pedidos, preferências de pagamento, notificações, consentimentos e chamados do próprio usuário. A solicitação de exclusão cria um chamado auditável e não executa uma ação destrutiva automática.

As telas de dados pessoais, pagamentos e privacidade foram conectadas aos contratos persistentes. Visitantes recebem estados controlados e não veem controles de conta autenticada.

## Evidências

A suíte completa passou com 75 testes aprovados e 1 ignorado. Typecheck, build, lint e `git diff --check` passaram. As 20 migrations foram aplicadas em banco MySQL vazio, incluindo `pediu_customer_payment_preferences` com restrição única por usuário.

No Expo Web, `/account/payment-methods`, `/account/privacy` e `/account/personal` abriram com estados de visitante coerentes e sem dados falsos ou controles de sessão indevidos.

## Referências

[1]: ../docs/ROADMAP_EXECUCAO_UNIFICADA.md "Roadmap de execução unificada do Pediu"
[2]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
