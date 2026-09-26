# Instrução técnica — concorrência e idempotência no PR #7

## Objetivo

Validar e endurecer os dois caminhos de dinheiro que podem receber retries simultâneos antes do Go-Live:

1. criação de checkout com a mesma chave de idempotência;
2. recebimento do mesmo webhook HMAC de pagamento em paralelo.

A fase usa banco MariaDB real, processo API compilado em `NODE_ENV=production` e fixtures isoladas. Nenhum pagamento real ou credencial de PSP é utilizado.

## Fonte da verdade e limites

- Todas as mudanças pertencem à branch `docs/go-live-plan`, no PR #7.
- `docs/GO_LIVE_PLAN.md` é o plano oficial e só recebe evidência após os gates locais e CI.
- O smoke usa somente o contrato local do webhook; ele não homologa PSP, PIX, reconciliação, refund ou webhook de provedor real.
- O PSP/PIX continua pendente por CNPJ, escolha de provedor, credenciais e homologação.
- Não marcar a Fase 6 inteira como concluída: status de entrega, `complete`, fiado, OAuth, CORS, storage, voz e limites de payload permanecem itens próprios de regressão.

## Implementação

### Checkout concorrente

`pediu.orders.create` mantém a leitura rápida por chave e, quando a criação transacional perde uma corrida de unique key, relê o pedido e o pagamento vencedores. A resposta mantém o mesmo `orderId` e `paymentId`, sem criar pedido, pagamento ou evento adicional.

### Webhook concorrente

`applyPaymentWebhook` mantém a transação como autoridade para inserir o evento, atualizar o pagamento e marcar o evento como processado. Quando duas transações tentam inserir o mesmo `(provider, providerEventId)`, a transação perdedora reconhece o conflito único encapsulado pelo Drizzle/MySQL, relê o evento vencedor e relê o pagamento persistido. Apenas conflitos únicos são recuperados; falhas de banco ou de regra continuam sendo propagadas.

`isUniqueConstraintError` percorre `cause`, `originalError` e `driverError`, reconhecendo códigos/errno do MySQL e mensagens de constraints conhecidas sem transformar erros irrelevantes em duplicidade.

## Smoke executável

Comando:

```bash
API_BASE_URL=http://127.0.0.1:3004 \
DATABASE_URL=<mariadb-de-validacao> \
JWT_SECRET=<segredo-de-teste> \
VITE_APP_ID=pr7-concurrency-app \
PAYMENT_WEBHOOK_SECRET=<segredo-de-teste> \
CONCURRENCY_REQUESTS=12 \
pnpm go-live:concurrency
```

O script:

1. cria usuário, loja, produto e endereço com identificadores únicos;
2. dispara 12 checkouts simultâneos com a mesma chave;
3. verifica uma única linha de pedido e pagamento e respostas com os mesmos IDs;
4. dispara 12 webhooks HMAC idênticos para o mesmo evento;
5. verifica 12 respostas HTTP 200, o mesmo pagamento `paid` e uma única linha de evento;
6. remove itens, pedidos, pagamentos, evento, endereço, produto, loja e usuários da fixture mesmo em falha.

A carga é limitada a 32 concorrentes por execução para manter o gate determinístico e seguro para CI.

## Critérios de aceite

- [x] Colisão de checkout não retorna 500 e converge para um pedido/pagamento.
- [x] Colisão de webhook não retorna 422 e converge para um evento/pagamento.
- [x] Conflito único encapsulado é reconhecido sem mascarar erro irrelevante.
- [ ] Testes focados, typecheck, suíte completa, build, lint e diff check verdes.
- [ ] Bundle de produção, deployment smoke e stress read-only verdes após a correção.
- [ ] Gate concorrente executado no workflow operacional do PR #7.
- [ ] CI e Operational Validation verdes no commit publicado.

## Evidência inicial da investigação

A primeira execução do smoke com 12 concorrentes encontrou duas falhas reais que mocks não capturavam:

- checkout simultâneo retornava HTTP 500 ao perder a unique key de `pediu_orders_idempotency_unique`;
- após o checkout ser corrigido, o webhook retornava uma resposta 200 e onze 422 porque a pré-leitura de `pediu_webhook_events` ocorria antes da inserção única concorrente.

As duas correções foram aplicadas e o smoke local posterior passou com a mensagem:

> `12 concurrent checkout retries collapsed to one order/payment and 12 duplicate webhooks collapsed to one event.`

Essa evidência inicial não substitui a matriz completa nem os checks remotos.

## Próximos incrementos ainda necessários

- status de entrega concorrente e dois `complete` simultâneos;
- lançamento de fiado concorrente;
- callbacks OAuth inválidos, replay e state;
- CORS, cookie de origem e storage;
- limites de voz e payload;
- PSP/PIX e webhook real, quando CNPJ, provedor e credenciais existirem.
