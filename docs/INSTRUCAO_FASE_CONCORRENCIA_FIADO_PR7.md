# Instrução técnica — concorrência de fiado no PR #7

## Objetivo

Proteger o crédito de um cliente contra duas compras fiado simultâneas, cobrindo dois cenários diferentes:

1. **mesma chave de idempotência**: retries devem convergir para um único pedido, pagamento fiado, lançamento de ledger e incremento de saldo;
2. **chaves diferentes**: compras legítimas concorrentes devem serializar o saldo e impedir oversubscription do limite de crédito.

## Fonte da verdade e limites

- Todas as alterações pertencem à branch `docs/go-live-plan`, no PR #7.
- O plano oficial é `docs/GO_LIVE_PLAN.md`.
- A validação usa MariaDB real, bundle `NODE_ENV=production` e fixtures isoladas.
- O fiado é um crédito interno da loja; nenhum PSP/PIX ou pagamento externo é simulado.
- Esta fase não conclui integração de cobrança, cobrança real, reconciliação ou política comercial de crédito.

## Implementação

### Bloqueio transacional do saldo

`createOrderWithFiado` agora:

- faz `SELECT ... FOR UPDATE` do registro de `pediu_customers` dentro da transação;
- revalida o pedido pela chave de idempotência depois de obter o lock;
- retorna `{ orderId, created: false }` quando outro retry já persistiu o pedido;
- só verifica limite, cria pedido/itens, atualiza saldo, grava ledger e cria pagamento fiado quando a operação é nova;
- preserva tudo na mesma transação.

Assim, duas chaves diferentes não podem ler o mesmo saldo antigo e ambas aprovarem o crédito.

### Contrato HTTP

A rota `pediu.orders.create` mantém `paymentId: null` para `paymentMethod: "fiado"`, inclusive quando:

- o retry encontra o pedido no pré-check de idempotência;
- a transação retorna um pedido já criado;
- a criação perde uma unique key e precisa reler o vencedor.

Retries fiado não criam evento `Pendente` nem notificação duplicada.

## Smoke executável

```bash
pnpm go-live:fiado-concurrency
```

O smoke cria fixture isolada e valida contra API em bundle real:

- duas requisições simultâneas com a mesma chave retornam o mesmo pedido e `paymentId: null`;
- existe uma linha de pedido, uma linha de item, uma linha de pagamento `paid`, uma linha de ledger e saldo igual a `30.00`;
- após reset controlado da fixture, duas requisições simultâneas com chaves diferentes geram uma aprovação e uma rejeição por limite;
- o saldo final continua `30.00`, sem atualização perdida;
- cleanup retorna zero usuários, pedidos e clientes `ci-fiado-*`.

## Critérios de aceite

- [x] Lock pessimista do cliente dentro da transação.
- [x] Retry de mesma chave não duplica crédito, pedido, pagamento ou ledger.
- [x] Retry fiado mantém `paymentId: null` no contrato público.
- [x] Duas chaves diferentes não ultrapassam o limite nem perdem saldo.
- [x] Smoke real passou após o bundle de produção ser recompilado.
- [x] Matriz local completa, deployment smoke e stress após o estado final.
- [ ] CI e Operational Validation verdes no commit publicado.

## Evidência inicial

Antes desta fase, o baseline do bundle final passou com deployment smoke, stress read-only de 120 requisições/12 workers e checkout/webhook concorrente. Durante a implementação, o smoke descobriu primeiro que o retry fiado expunha o `paymentId` interno; depois descobriu que o pré-check genérico também precisava respeitar o contrato fiado. Após as duas correções, o smoke combinado passou e confirmou zero fixtures residuais. Os gates finais e a publicação ainda precisam ser executados sobre o estado completo desta fase.

A matriz final passou com 28 arquivos, 120 testes aprovados e 1 ignorado; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier dos arquivos da fase e `git diff --check` ficaram verdes. O deployment smoke passou com health 200, marketplace 200, CORS exato e métricas protegidas. O stress read-only passou com 120 requests, concorrência 12, p50 de 17,0 ms, p95 de 47,8 ms, máximo de 62,7 ms e erro 0%. O smoke fiado ampliado passou três vezes e o cleanup confirmou zero fixtures. O CI e o Operational Validation ainda precisam passar no commit desta fase.
