# Pediu — Execução A–G

## Estado

Branch de execução: `feat/pediu-full-roadmap`

### A — Auditoria
- [x] Arquitetura atual preservada.
- [x] Rotas existentes tratadas como fonte de verdade.
- [x] Não recriar páginas existentes.

### B — Gap de Frontend
- [x] Páginas novas de experiência identificadas/criadas nas iterações anteriores.
- [ ] Auditoria final de todas as rotas ainda necessária.

### C — Backend / Contratos
- [x] `experienceRouter` presente e composto.
- [x] Marketplace/pedidos/pagamentos existentes preservados.
- [x] Migration de experiência adicionada (`0011_experience.sql`).
- [x] MFA persistente com hash, expiração, consumo único e limite de tentativas.
- [x] Perfil persistente de entregador e atribuição por pedido (`0013_mfa_couriers.sql`).
- [x] Tracking pode ser publicado pelo lojista autorizado ou entregador atribuído.
- [x] Provedor MFA externo isolado por `MFA_DELIVERY_URL`.
- [ ] Suporte persistente.

### D — Navegação
- [ ] Ligações finais entre páginas novas e rotas existentes.

### E — Validação
- [ ] TypeScript.
- [ ] Lint.
- [ ] Testes.
- [ ] Validação das migrations em banco real.

### F — Integração
- [x] Cupom possui validação server-side.
- [x] Novo fluxo `couponOrders.create` calcula subtotal, desconto, entrega e total no servidor e grava pedido/pagamento em transação.
- [x] Reviews verificam propriedade e pedido entregue.
- [x] Chat possui leitura/envio protegido ao cliente do pedido.
- [x] Tracking possui leitura protegida e publicação autorizada.
- [x] Pagamento PIX possui contrato server-side existente.
- [ ] Retorno de pagamento conectado ao estado persistido do pagamento.
- [ ] Checkout existente migrado para `couponOrders.create` sem alterar a página atual até validação da navegação.

### G — Modernização
- [ ] Design system.
- [ ] Estados de loading/empty/error/success.
- [ ] Microinterações.
- [ ] Animações.
- [ ] Performance.
- [ ] Acessibilidade.
- [ ] Polimento visual global.

## Regra de alteração

Arquivo/rota existente: preservar.  
Funcionalidade ausente: criar nova página/contrato.  
Nenhuma tela é considerada pronta apenas por existir; integração e validação são obrigatórias.
