# Pediu — Arquitetura de Aplicativo

## Diretriz

O projeto atual usa Expo Router + React Native no cliente, tRPC + Express no servidor e Drizzle ORM sobre MySQL. A implementação será evoluída nessa arquitetura, sem introduzir uma segunda camada de persistência sem necessidade.

## Camadas

```text
Mobile (Expo / React Native)
  ├─ Expo Router: navegação e deep links
  ├─ React Query: cache, sincronização e estados assíncronos
  ├─ componentes compartilhados: UI/design system
  └─ serviços nativos: localização, notificações, SecureStore

API (tRPC / Express)
  ├─ auth: sessão, OAuth e recuperação
  ├─ marketplace: lojas, categorias, busca e catálogo
  ├─ cart/checkout: preço, taxas, cupom e fechamento
  ├─ orders: ciclo de vida e rastreio
  ├─ payments: Pix/cartão/dinheiro + webhooks
  ├─ delivery: atribuição e localização do entregador
  ├─ reviews: avaliações pós-venda
  ├─ support: FAQ/tickets/chat
  └─ admin: auditoria e operação

Persistência (MySQL / Drizzle)
  ├─ identidade e preferências
  ├─ endereços
  ├─ lojas/produtos/categorias
  ├─ pedidos/itens/status
  ├─ pagamentos/transações/webhooks
  ├─ cupons/promoções
  ├─ entrega/rastreamento
  ├─ avaliações
  ├─ notificações
  └─ suporte/auditoria
```

## Fluxo alvo

1. Onboarding → autenticação → verificação quando exigida.
2. Localização → endereço atual/salvo.
3. Home → categorias → busca/filtros → loja → produto.
4. Carrinho → cupom → endereço → entrega/retirada → pagamento → pedido.
5. Pedido → timeline → rastreamento → suporte.
6. Entrega concluída → avaliação de loja/produto/entregador.
7. Conta → pedidos, endereços, pagamentos, notificações, suporte, privacidade.

## Regras de domínio

- O servidor é a fonte de verdade para preço, disponibilidade, taxas, cupom, total e transição de status.
- O cliente nunca deve confiar em preço enviado pelo dispositivo.
- Cada pedido pertence a uma loja; carrinho multi-loja será explicitamente separado em sessões de checkout.
- Operações financeiras devem ser idempotentes.
- Webhooks de pagamento devem ser persistidos antes do processamento e protegidos contra duplicidade.
- Dados de cartão não serão armazenados pelo Pediu; o provedor de pagamento deve tokenizar os dados.
- Localização do entregador deve ser limitada ao período necessário para a entrega e protegida por autorização.
- Avaliações só podem ser criadas por participantes de um pedido elegível.

## Fases

### Fase 1 — Fundação do fluxo do cliente

Onboarding, autenticação/recuperação, localização, busca, loja/produto, carrinho e checkout.

### Fase 2 — Operação do pedido

Timeline persistente, entrega, GPS do entregador, notificações e suporte.

### Fase 3 — Pós-venda e confiança

Avaliações, favoritos, denúncias, moderação e histórico enriquecido.

### Fase 4 — Marketplace avançado

Cupons, campanhas, recomendação, disponibilidade por região e cálculo de frete.

### Fase 5 — Produção

Observabilidade, testes E2E, hardening, LGPD, performance, CI/CD e release Android/iOS.
