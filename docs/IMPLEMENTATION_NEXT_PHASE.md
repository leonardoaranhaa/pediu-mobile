# Pediu — Próxima fase de implementação

## Implementado nesta etapa
- migration `0010_customer_addresses.sql` para endereços persistentes por usuário;
- validação de payload e propriedade de endereço em `server/domain/customer-addresses.ts`;
- cálculo determinístico de cotação em centavos em `server/domain/checkout-quote.ts`;
- testes de isolamento de endereço e cálculo de checkout.

## Ordem restante
1. Integrar CRUD de endereços ao router tRPC e à tela de endereços.
2. Integrar cotação server-side ao checkout existente.
3. Fazer criação de pedido consumir preços/disponibilidade atuais do banco e snapshotar os itens.
4. Cupons com validação server-side e idempotência.
5. Reviews vinculadas a pedido/item/entrega.
6. Rastreamento do entregador via eventos + posição atual.
7. Chat pedido/entrega/suporte com mensagens persistentes.
8. MFA/recuperação de acesso integrado ao provedor de autenticação.
9. Suporte e notificações transacionais.

## Princípios
- O cliente nunca define preço, disponibilidade, taxa ou total final.
- Toda operação de checkout deve ser idempotente.
- O servidor valida propriedade do pedido/endereço antes de qualquer leitura ou escrita.
- Status de pedido seguem uma máquina de estados explícita.
- Dados de cartão não são armazenados pelo Pediu; apenas tokens/referências do provedor.
