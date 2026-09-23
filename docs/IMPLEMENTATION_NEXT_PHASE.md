# Pediu — Próxima fase de implementação

## Objetivo
Transformar as telas-base em fluxos transacionais com autoridade no servidor.

## Ordem de execução
1. Endereços persistentes e seleção de endereço.
2. Checkout server-side com snapshot de itens/preços/taxas.
3. Cupons com validação server-side e idempotência.
4. Reviews vinculadas a pedido/item/entrega.
5. Rastreamento do entregador via eventos + posição atual.
6. Chat pedido/entrega/suporte com mensagens persistentes.
7. MFA/recuperação de acesso integrado ao provedor de autenticação.
8. Suporte e notificações transacionais.

## Princípios
- O cliente nunca define preço, disponibilidade, taxa ou total final.
- Toda operação de checkout deve ser idempotente.
- O servidor valida propriedade do pedido antes de qualquer leitura/escrita.
- Status de pedido devem seguir uma máquina de estados explícita.
- Dados de cartão não serão armazenados pelo Pediu; somente tokens/referências do provedor.
- Rastreamento deve registrar eventos e não depender exclusivamente da posição em tempo real.
- Reviews só podem ser criadas por usuários elegíveis após conclusão do pedido.

## Contratos planejados
- `addresses.list/create/update/delete/setDefault`
- `checkout.quote`
- `checkout.createOrder`
- `coupons.validate`
- `reviews.create/list`
- `delivery.location`
- `delivery.events`
- `chat.threads/messages`
- `support.tickets/messages`

## Segurança
A autorização deve ser aplicada no backend usando o usuário autenticado da sessão. IDs enviados pelo cliente são apenas referências; nunca são prova de autorização.
