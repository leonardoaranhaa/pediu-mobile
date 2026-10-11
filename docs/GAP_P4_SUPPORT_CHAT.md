# Prioridade 4 — Suporte da conta com backend real

## Problema

`app/account/support-chat.tsx` guardava mensagens só em `useState`. Ao sair da tela, o histórico sumia e nada chegava ao admin.

## Solução

A tela passou a usar as mesmas rotas de `app/support.tsx`:

| Operação | tRPC |
|----------|------|
| Listar chamados | `pediu.experience.support.list` |
| Criar chamado | `pediu.experience.support.create` |
| Listar mensagens | `pediu.experience.support.messages.list` |
| Enviar mensagem | `pediu.experience.support.messages.send` (idempotência) |
| Marcar lidas | `pediu.experience.support.messages.markRead` |

## Aceite

- [x] Sem mensagens apenas locais
- [x] Exige autenticação
- [x] Polling de mensagens do ticket selecionado
- [x] Atalho para `/support` (tela completa)
- [ ] Push de resposta do admin validado em device (worker + token)

## Próximo (P5)

Catálogo comercial: adicionais/modificadores, horário de loja, frete por zona, multi-loja explícito.
