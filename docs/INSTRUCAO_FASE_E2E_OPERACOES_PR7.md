# Instrução técnica — E2E operacional de lojista e entrega no PR #7

## Objetivo

Adicionar uma jornada automatizada sobre API Express e MariaDB reais que cubra o trecho posterior ao checkout: o lojista aceita e prepara o pedido, marca-o como pronto, atribui a entrega, registra localização, o cliente consulta o acompanhamento e a entrega é concluída com retry idempotente.

## Escopo

O fixture cria dois usuários, loja, produto e endereço identificados por UUID curto. O pedido usa pagamento em dinheiro para não fabricar aprovação de PSP. A jornada usa Bearer emitido pelo SDK de teste, executa apenas contratos protegidos e remove todos os registros criados ao final, inclusive pedido, eventos, pagamento, atribuição, localização, endereço, produto, loja e usuários.

## Critérios de aceite

- O lojista visualiza o pedido e avança `Pendente → Aceito → Preparando → Pronto`.
- Atribuição é autorizada somente ao proprietário da loja.
- A primeira localização muda o pedido para `A caminho` e a repetição da conclusão não cria uma segunda transição.
- O cliente vê entregador, ETA, coordenadas e status atuais.
- A sequência de eventos termina em `Pendente`, `Aceito`, `Preparando`, `Pronto`, `A caminho`, `Entregue`.
- O cleanup deixa o banco sem os identificadores do fixture.

## Execução

```bash
pnpm go-live:operations-e2e
```

O workflow operacional executa esta jornada depois do E2E de cliente e antes dos baselines de estresse. O PSP PIX continua deliberadamente fora desta fase: aprovação financeira e webhook somente serão aceitos após CNPJ, provedor e homologação.

## Registro da execução — 25/09/2026

A primeira execução atravessou criação de pedido, transições, atribuição, localização e tracking, mas detectou que o evento `A caminho` não aparecia na consulta histórica embora o status do pedido fosse atualizado. A causa foi a leitura incompleta do retorno de `UPDATE` do Drizzle/MySQL. O helper compartilhado `getAffectedRows` foi criado e aplicado em despacho, conclusão e status administrativo.

A segunda execução passou contra o bundle de produção e o banco limpo, comprovando a sequência completa, a localização persistida, a consulta do cliente e a conclusão idempotente. O fixture foi removido no `finally` do script.

Na repetição do deployment smoke público, um processo configurado apenas com `ALLOWED_ORIGINS=http://localhost:8081` foi corretamente rejeitado com 403 para a origem HTTPS do preview. Após declarar explicitamente a origem pública, o preflight passou com eco exato e o estresse remoto permaneceu sem erros. A falha foi de configuração operacional e fica registrada para evitar que domínios reais sejam esquecidos.
