## Implementação concluída nesta fatia

- `server/payments.ts` usa o contrato oficial do Payments API para refund: `POST /v1/payments/{id}/refunds`, `amount` numérico apenas quando parcial e `X-Idempotency-Key`; chamadas externas possuem timeout e a resposta do PSP não é exposta integralmente.
- `server/db.ts` serializa refunds por `paymentId` com lock transacional `FOR UPDATE`, relê a chave idempotente dentro da transação e impede oversubscription de refunds concorrentes.
- O webhook canônico Mercado Pago confirma o pagamento somente após HMAC, consulta do recurso no PSP mock e validação de referência, valor, moeda e status; o ledger de venda permanece único por replay.
- A reconciliação é limitada a 500 registros, idempotente por provider/chave, persistindo `matched` e `missing_internal` para divergências visíveis ao admin.
- `scripts/go-live-finance.ts` cobre confirmação HMAC, dois refunds simultâneos com a mesma chave, refund adicional rejeitado por saldo, ledger único, reconciliação idempotente e cleanup isolado.
- `scripts/mercado-pago-api-mock.ts` fornece apenas o mock local/CI do contrato; ele não representa homologação nem produção do PSP.

## Evidências verificadas

- Migration `0027_payment_reconciliation.sql` aplicada e reexecutada no MariaDB real de validação; tabelas de refunds e reconciliação presentes.
- Regressões focadas: 4 arquivos, 27 testes aprovados; matriz completa: 37 arquivos, 172 testes aprovados.
- Smoke financeiro repetido 3 vezes e executado novamente no bundle final: aprovado em todas as execuções. Cada rodada comprovou refund idempotente, bloqueio de oversubscription, uma venda no ledger, uma reconciliação com 1 `matched` + 1 `missing_internal` e cleanup sem fixtures.
- Deployment smoke final: health/marketplace/CORS/métricas protegidas aprovados no bundle `http://127.0.0.1:3004`.
- Stress final read-only: 120 requests, 12 workers, `p50=16.0ms`, `p95=27.7ms`, `max=62.0ms`, erro `0.0000`.
- Após corrigir o cleanup financeiro da fase anterior, concorrência com 24 retries/webhooks e fiado concorrente passaram com zero usuários/stores/ledger órfãos; CORS, storage e limites de voz/payload também passaram.

## Limites que continuam abertos

- O PSP/PIX real continua pendente por CNPJ, credenciais de produção, configuração de aplicação, URL HTTPS definitiva, webhook real e homologação autorizada. Nenhum pagamento real foi executado.
- Permanecem pendentes as dependências externas já registradas no Go-Live: domínio/staging/produção definitivos, OAuth/e-mail/push reais, storage externo, observabilidade externa, backup operacional contínuo, dispositivos físicos e publicação nas lojas.
- Portanto, esta fatia fecha a **base técnica simulada e verificável** de pagamento/refund/reconciliação, mas não fecha o Go-Live comercial nem torna o PR #7 READY.

## Referências externas consultadas

- [Mercado Pago — Create refund](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-pro/create-refund/post): confirma `POST /v1/payments/{id}/refunds`, `amount` opcional para refund parcial e `X-Idempotency-Key` obrigatório.
