# Fase de avaliações pós-entrega e suporte operacional

## Objetivo

Conectar a avaliação ao pedido entregue, garantir que cada usuário possa avaliar cada alvo uma única vez e tornar o suporte operacional auditável para o cliente.

## Metodologia

O servidor validará que o pedido pertence ao usuário autenticado e está em `Entregue`. Cada envio usará uma chave de idempotência estável por alvo. A repetição da mesma chave ou da mesma avaliação retornará o registro existente sem criar duplicata. A interface manterá as chaves durante retries parciais para que loja, produto e entregador não recebam avaliações duplicadas.

O alvo do entregador será aceito apenas como avaliação do pedido entregue. A lista de avaliações será carregada do servidor e o cliente verá quando uma avaliação já tiver sido registrada. O suporte continuará separado do review e servirá para solicitações que exigem atendimento.

## Critérios de aceite

A migration deverá aplicar em banco vazio e manter compatibilidade com avaliações existentes. Usuários não poderão avaliar pedidos de terceiros ou pedidos não entregues. Repetições deverão ser idempotentes. A tela de feedback deverá tratar sucesso parcial e falhas sem declarar avaliação concluída antes de todas as submissões.

## Limitações explícitas

A fase não cria moderação automática nem resposta pública do estabelecimento. A avaliação de produto permanece associada ao pedido quando não houver um produto individual selecionado.

## Referências

[1]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ../docs/REPO_LEVANTAMENTO_NORTE.md "Levantamento técnico e norte de implementação"

## Implementação realizada

A migration `0020_review_idempotency.sql` adicionou uma chave única de idempotência às avaliações. O backend passou a exigir pedido entregue, validar que o pedido pertence ao usuário autenticado e retornar a avaliação existente em retries. A tela de feedback usa uma chave determinística por alvo para que uma falha parcial possa ser repetida sem duplicar avaliações de loja, produto ou entregador.

A tela de feedback também foi protegida para visitantes. O suporte continua sendo o canal separado para solicitações que exigem atendimento ou análise de conta.

## Evidências

A suíte completa passou com 79 testes aprovados e 1 ignorado. Typecheck, build, lint e `git diff --check` passaram. As 21 migrations foram aplicadas em banco MySQL vazio; a tabela de avaliações contém a restrição única da chave de idempotência.

No Expo Web, `/feedback/101` abriu apenas a mensagem de acesso autenticado e não exibiu o formulário a visitantes.

## Referências

[1]: ../docs/IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ../docs/REPO_LEVANTAMENTO_NORTE.md "Levantamento técnico e norte de implementação"
