# Fase de mensagens persistentes de suporte

## Objetivo

Evoluir chamados de suporte para uma conversa persistente entre cliente e equipe operacional, mantendo autorização por chamado, leitura, retries idempotentes e notificações internas.

## Critérios de aceite

O cliente somente poderá ler e responder seus próprios chamados. Usuários administrativos poderão responder chamados operacionais. Cada mensagem terá chave única de idempotência, e retries não deverão gerar mensagens ou push duplicados. A interface deverá permitir selecionar um chamado, acompanhar novas mensagens e enviar resposta sem confundir suporte com o chat do pedido.

## Limitações

A fase não cria uma fila de agentes nem SLA automático. O papel administrativo será a autorização existente; a distribuição de atendimento permanece operacional.

## Referências

[1]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ../docs/REPO_LEVANTAMENTO_NORTE.md "Levantamento técnico e norte de implementação"

## Implementação realizada

A migration `0021_support_ticket_messages.sql` criou mensagens persistentes por chamado, com papel do remetente, leitura, chave de idempotência e índice cronológico. O backend autoriza o proprietário do chamado e usuários administrativos; demais usuários não conseguem ler nem responder. Retries devolvem a mensagem existente e mensagens administrativas geram notificação interna ao proprietário.

A tela de suporte permite selecionar um chamado, acompanhar mensagens por polling, marcar mensagens como lidas e responder com a mesma chave durante retries. Visitantes continuam bloqueados antes de qualquer consulta protegida.

## Evidências

A suíte completa passou com 83 testes aprovados e 1 ignorado. Typecheck, build, lint e `git diff --check` passaram. As 22 migrations foram aplicadas em banco MySQL vazio e a tabela de mensagens possui chave única de idempotência e índice por chamado/data.

No Expo Web, `/support` abriu o estado visitante esperado, sem formulário ou histórico de conta autenticada.

## Referências

[1]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ../docs/REPO_LEVANTAMENTO_NORTE.md "Levantamento técnico e norte de implementação"

## Extensão administrativa

O painel administrativo ganhou listagem paginada de chamados, seleção de conversa, resposta como suporte e transição de status entre aberto, em atendimento, resolvido e encerrado. Cada mudança de status gera um registro na auditoria administrativa. O router usa `adminProcedure`, portanto comerciantes e usuários comuns não acessam o painel.

Os testes administrativos cobrem leitura, mudança de status, auditoria e rejeição de perfis não administrativos. A suíte total permanece em 83 testes aprovados e 1 ignorado, com build, lint e typecheck verdes.
