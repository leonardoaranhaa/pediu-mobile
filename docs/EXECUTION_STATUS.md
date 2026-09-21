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
- [x] `experienceRouter` presente.
- [x] `experienceRouter` composto no `appRouter`.
- [x] Marketplace/pedidos/pagamentos existentes preservados.
- [x] Migration de experiência adicionada (`0011_experience.sql`).
- [x] Publicação de tracking restrita ao proprietário do estabelecimento do pedido.
- [ ] MFA real.
- [ ] Suporte persistente.
- [ ] Papel/identidade de entregador dedicado para publicação de GPS.

### D — Navegação
- [ ] Ligações finais entre páginas novas e rotas existentes.

### E — Validação
- [ ] TypeScript.
- [ ] Lint.
- [ ] Testes.
- [ ] Validação de migrations.

### F — Integração
- [x] Cupom possui validação server-side.
- [x] Reviews verificam propriedade e pedido entregue.
- [x] Chat possui leitura/envio protegido ao cliente do pedido.
- [x] Tracking possui leitura protegida e publicação autorizada.
- [x] Pagamento PIX possui contrato server-side existente.
- [ ] Aplicar desconto de cupom ao total transacional do checkout.
- [ ] Retorno de pagamento conectado ao estado persistido do pagamento.

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
