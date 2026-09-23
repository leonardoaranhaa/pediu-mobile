# Pediu — Matriz de Gap do Fluxo

Legenda: `OK` = existe de forma funcional/estrutural; `PARCIAL` = existe, mas precisa completar; `FALTA` = não identificado no código atual.

| Área | Requisito | Estado atual | Próxima implementação |
|---|---|---:|---|
| Entrada | Onboarding 3 telas | FALTA | criar fluxo persistente de primeiro acesso |
| Entrada | Login/cadastro | PARCIAL | OAuth seguro implementado; falta configurar provedor |
| Entrada | MFA SMS/WhatsApp | FALTA/BLOQUEADO | abstração OTP + provedor externo |
| Entrada | Recuperação de senha | FALTA/BLOQUEADO | fluxo do provedor de autenticação |
| Localização | GPS | PARCIAL | consolidar permissões e endereço |
| Localização | Endereço manual/autocomplete | FALTA | serviço de geocoding + CRUD |
| Home | Home/categorias | PARCIAL | separar descoberta da tela monolítica |
| Descoberta | Busca/filtros | OK/PARCIAL | endpoint paginado + filtros implementados |
| Loja | Catálogo | OK/PARCIAL | tela dedicada e dados reais implementados |
| Produto | Detalhes/adicionais | PARCIAL | modelo de opções/modificadores |
| Carrinho | Carrinho | OK/PARCIAL | quantity, observações, cotação e cupom implementados |
| Checkout | Endereço/entrega/pagamento/taxas | OK/PARCIAL | checkout server-side e confirmação implementados |
| Pagamento | Pix | OK/PARCIAL | webhooks e reconciliação |
| Pagamento | Cartão | FALTA/PARCIAL | tokenização via gateway |
| Pedido | Histórico | OK/PARCIAL | detalhes e reorder |
| Pedido | Timeline | PARCIAL | estado persistente e eventos |
| Entrega | GPS entregador | OK/PARCIAL | atribuição, posição, ETA e eventos implementados |
| Entrega | Chat | OK/PARCIAL | chat persistente de pedido implementado |
| Pós-venda | Avaliações | OK/PARCIAL | reviews elegíveis e idempotentes implementados |
| Conta | Perfil | OK/PARCIAL | edição persistente de dados básicos implementada |
| Conta | Endereços | OK/PARCIAL | persistência e endereço padrão implementados |
| Conta | Pagamentos salvos | FALTA/PARCIAL | preferências persistentes; tokenização externa pendente |
| Conta | Notificações | OK/PARCIAL | preferências, leitura, push e deep links implementados |
| Conta | Ajuda/FAQ/chat | OK/PARCIAL | tickets, mensagens e painel admin implementados |
| Privacidade | Termos/LGPD/exclusão | OK/PARCIAL | consentimentos, exportação e exclusão assistida implementados |
| Marketplace | Cupons/promoções | OK/PARCIAL | motor de cupom server-side implementado |
| Operação | Admin/auditoria | OK/PARCIAL | suporte operacional e auditoria implementados |

## Ordem de execução

1. Fundação de navegação e onboarding.
2. Identidade + sessão + recuperação/MFA.
3. Endereços + localização.
4. Marketplace: categorias, busca, filtros e loja.
5. Carrinho e checkout server-side.
6. Pagamentos e webhooks.
7. Timeline + delivery tracking.
8. Reviews + suporte.
9. Conta/privacidade/pagamentos salvos.
10. QA E2E + produção.
