# Pediu — Matriz de Gap do Fluxo

Legenda: `OK` = existe de forma funcional/estrutural; `PARCIAL` = existe, mas precisa completar; `FALTA` = não identificado no código atual.

| Área | Requisito | Estado atual | Próxima implementação |
|---|---|---:|---|
| Entrada | Onboarding 3 telas | FALTA | criar fluxo persistente de primeiro acesso |
| Entrada | Login/cadastro | PARCIAL | completar credenciais + OAuth e estados |
| Entrada | MFA SMS/WhatsApp | FALTA | abstração OTP + provedor |
| Entrada | Recuperação de senha | FALTA | fluxo de recuperação |
| Localização | GPS | PARCIAL | consolidar permissões e endereço |
| Localização | Endereço manual/autocomplete | FALTA | serviço de geocoding + CRUD |
| Home | Home/categorias | PARCIAL | separar descoberta da tela monolítica |
| Descoberta | Busca/filtros | FALTA | endpoint paginado + filtros |
| Loja | Catálogo | PARCIAL | tela dedicada e dados reais |
| Produto | Detalhes/adicionais | PARCIAL | modelo de opções/modificadores |
| Carrinho | Carrinho | PARCIAL | item quantity, observações e cupom |
| Checkout | Endereço/entrega/pagamento/taxas | PARCIAL | checkout server-side |
| Pagamento | Pix | OK/PARCIAL | webhooks e reconciliação |
| Pagamento | Cartão | FALTA/PARCIAL | tokenização via gateway |
| Pedido | Histórico | OK/PARCIAL | detalhes e reorder |
| Pedido | Timeline | PARCIAL | estado persistente e eventos |
| Entrega | GPS entregador | FALTA | modelo de delivery + tracking |
| Entrega | Chat | FALTA | conversa cliente/loja/entregador |
| Pós-venda | Avaliações | FALTA | reviews por loja/produto/entregador |
| Conta | Perfil | OK | integrar dados completos |
| Conta | Endereços | PARCIAL | persistência e endereço padrão |
| Conta | Pagamentos salvos | FALTA | referências tokenizadas |
| Conta | Notificações | PARCIAL | preferências + canais |
| Conta | Ajuda/FAQ/chat | FALTA | central + tickets |
| Privacidade | Termos/LGPD/exclusão | PARCIAL | consentimentos e account deletion |
| Marketplace | Cupons/promoções | FALTA | motor de cupom/promoção |
| Operação | Admin/auditoria | OK/PARCIAL | ampliar moderação e métricas |

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
