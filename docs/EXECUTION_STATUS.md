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
- [ ] MFA real.
- [ ] Suporte persistente.
- [ ] Tracking com autorização de papel e publicação do entregador.

### D — Navegação
- [ ] Ligações finais entre páginas novas e rotas existentes.

### E — Validação
- [ ] TypeScript.
- [ ] Lint.
- [ ] Testes.
- [ ] Validação de migrations.

### F — Integração
- [ ] Cupom ligado ao fluxo de checkout existente.
- [ ] Reviews ligadas ao pedido entregue.
- [ ] Chat ligado ao pedido.
- [ ] Tracking ligado ao pedido.
- [ ] Pagamento ligado ao retorno do provedor.

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
