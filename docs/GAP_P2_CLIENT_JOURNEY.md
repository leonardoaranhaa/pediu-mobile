# Prioridade 2 — Jornada do cliente sem mock

## Objetivo

Garantir que, após o checkout, o cliente acompanhe **pedido real**, **pagamento real**, **entrega real** e **chat real**, sem dados demonstrativos na timeline.

## O que já existia no backend

| Capacidade | Rota / módulo | Notas |
|------------|---------------|--------|
| Status do pedido | `pediu.orders.get` / `orders.mine` | Máquina em `server/order-state.ts` |
| Pagamento + PIX | `pediu.payments.get` | Polling no track e success |
| Eventos de tracking | `pediu.experience.tracking.events` | Autorizado ao dono do pedido |
| Entrega atual + ETA + frescor | `pediu.experience.delivery.current` | `classifyTrackingFreshness` |
| Chat do pedido | `pediu.experience.chat.*` | Idempotência + push ao destinatário |
| Push (outbox) | `server/push.ts` + worker | Expo Push; depende de token no device |
| Avaliação | `pediu.experience.reviews.*` | Só após `Entregue` |

## Gap fechado neste incremento (cliente)

Arquivo: `app/order/track.tsx`

- Consome `experience.delivery.current` no hub de acompanhamento (ETA, entregador, frescor da posição).
- Mensagens de status **por etapa** (substitui texto genérico “em tempo real”).
- Atalhos explícitos: **mapa/posição**, **chat do pedido**, **avaliar** (quando entregue).
- Deixa claro que os dados vêm do servidor e o polling continua ativo.

## Ainda depende de configuração / dispositivo (não é mock de UI)

1. **Push no aparelho** — registrar Expo push token, preferências `orderUpdates`, worker de outbox rodando.
2. **Mapa visual** — hoje coordenadas + timeline; mapa nativo (Google/Apple) é opcional e ainda não está no bundle.
3. **Cancelamento pelo cliente** — regra `canCustomerCancelOrder` no server; falta mutation + botão na UI se for produto desejado.
4. **E2E automatizado** — jornada completa ainda no go-live plan.
5. **Notificação ao mudar status da loja** — push de “A caminho”/“Entregue” já dispara em `delivery.location` / `delivery.complete`; outras transições (Aceito, Preparando) devem enfileirar push de forma simétrica se ainda não o fazem no router de pedidos.

## Critério de aceite da prioridade 2

- [x] Track não depende de array mock de status além da lista canônica alinhada a `ORDER_STATUSES`.
- [x] Track mostra dados de `orders.get` + opcionalmente `delivery.current`.
- [x] Cliente alcança chat e tracking-map a partir do hub.
- [x] Pós-entrega aponta para feedback.
- [ ] Push de mudança de status validado em Android/iOS físicos.
- [ ] E2E automatizado cliente (checkout → track → chat → entregue).

## Próximo passo na sequência (prioridade 3)

Auth honesta: recuperação de senha real **ou** desativar a UI até existir provedor; MFA só com OTP real.
