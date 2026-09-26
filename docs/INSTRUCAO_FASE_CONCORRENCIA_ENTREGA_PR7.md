# Instrução técnica — concorrência de entrega e máquina de estados no PR #7

## Objetivo

Fechar dois cenários da Fase 6 que envolvem o mesmo pedido recebido em paralelo:

1. duas transições idênticas de status do pedido;
2. duas conclusões simultâneas da mesma entrega.

A fatia deve preservar a máquina de estados, evitar eventos/notificações duplicados e impedir que uma atualização baseada em leitura antiga sobrescreva uma transição concorrente.

## Fonte da verdade e limites

- Todas as alterações pertencem à branch `docs/go-live-plan`, no PR #7.
- O plano oficial é `docs/GO_LIVE_PLAN.md`.
- A validação usa MariaDB real, API em bundle `NODE_ENV=production` e fixtures isoladas.
- Nenhum pagamento real, PSP/PIX real, credencial de provedor ou dependência externa é simulado.
- Esta fatia não conclui os demais itens de concorrência e segurança: fiado, OAuth, CORS, storage, voz e limites de payload permanecem separados.

## Implementação

### Transição condicional de status

`updateOrderStatus` agora aceita o status esperado e executa o `UPDATE` somente quando o pedido ainda está nesse status. O resultado informa se a linha foi alterada e qual status ficou persistido.

A rota `pediu.orders.status`:

- grava um único evento quando vence a corrida;
- retorna sucesso idempotente quando outra chamada já aplicou o mesmo status;
- não envia notificação duplicada;
- rejeita uma chamada stale quando outra transição diferente venceu a corrida;
- aplica a mesma proteção ao cancelamento concorrente do cliente.

### Conclusão de entrega

`completeDelivery` já possuía atualização condicional `A caminho → Entregue` dentro de transação. O E2E passa a enviar duas conclusões simultâneas e verifica que ambas respondem com o status final, enquanto o banco mantém somente uma transição/evento.

## E2E executável

O comando existente foi ampliado:

```bash
pnpm go-live:operations-e2e
```

Para cada transição `Pendente → Aceito → Preparando → Pronto`, o smoke dispara duas chamadas simultâneas. Depois dispara duas conclusões simultâneas e valida:

- fluxo completo do lojista, courier e cliente;
- uma ocorrência de cada evento de status;
- estado final `Entregue`;
- conclusão idempotente;
- cleanup completo da fixture.

## Critérios de aceite

- [x] Duas mudanças idênticas simultâneas convergem para um evento.
- [x] Uma transição stale não pode sobrescrever a transição vencedora.
- [x] Duas conclusões simultâneas retornam sucesso sem duplicar a conclusão.
- [x] Regressões unitárias cobrem status e conclusão concorrentes.
- [x] O E2E real passa repetidamente e remove as fixtures.
- [x] Matriz completa, deployment smoke e stress após o estado final.
- [ ] CI e Operational Validation verdes no commit de correção publicado.

## Evidência inicial

Antes desta fatia, o baseline do bundle publicado `dbca2bd` passou com deployment smoke, stress read-only de 120 requisições/12 workers e o smoke de checkout/webhook concorrente. A primeira execução da versão de entrega durante a troca do bundle retornou HTTP 500 no status; o processo foi estabilizado, o diagnóstico foi reforçado e o E2E passou três vezes consecutivas com zero fixtures residuais.

Antes do primeiro push, a matriz passou com 28 arquivos, 118 testes aprovados e 1 ignorado; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier dos arquivos da fase e `git diff --check` ficaram verdes. O deployment smoke passou com health 200, marketplace 200, CORS exato e métricas protegidas. O stress read-only passou com 120 requests, concorrência 12, p50 de 15,2 ms, p95 de 43,5 ms, máximo de 62,2 ms e erro 0%. O smoke de checkout/webhook concorrente também permaneceu verde.

Após o primeiro push, o CI remoto capturou um timing adicional: a segunda chamada podia ler `Aceito` depois que a primeira já venceu e então tentava validar `Aceito → Aceito`, retornando HTTP 500. A rota passou a aceitar imediatamente o status já persistido, sem atualizar banco nem criar evento, e foi adicionada uma regressão unitária específica. No bundle recompilado, o E2E passou três vezes consecutivas; a matriz final passou com 119 testes aprovados e 1 ignorado; o deployment smoke passou; e o stress read-only passou com 120 requests, concorrência 12, p50 de 14,0 ms, p95 de 34,8 ms, máximo de 62,5 ms e erro 0%.
