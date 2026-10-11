# Prioridade 5 — Catálogo comercial

## Objetivo

Fechar gaps de compra real: multi-loja explícita, observação no item, e especificar o que ainda falta no servidor (adicionais, horário, frete por zona).

## Já implementado (antes + este PR)

| Capacidade | Estado |
|------------|--------|
| Uma loja por carrinho | Sim — `lib/cart.ts` |
| Preço/disponibilidade no server no checkout | Sim |
| Taxa de entrega no item (estimativa) | Sim — recalculada no checkout |
| Observação por item no carrinho | Sim |
| **Troca de loja com confirmação** | **Novo** — mode `replace` + UI no produto |
| **Observação na tela de produto** | **Novo** |

## Feito neste incremento

1. `addProductToCart(..., mode: "reject" | "replace")` e `conflictStore` no resultado.
2. `CartProvider.addItem` aceita o mode.
3. Produto: conflito de loja com **Substituir carrinho** ou **Manter**.
4. Campo observação antes de adicionar.
5. Texto honesto sobre adicionais/horário/frete zona ainda server-side.

## Ainda falta (spec para próximas sprints)

### A. Modificadores / adicionais

- Tabelas: `product_option_groups`, `product_options` (obrigatório/opcional, min/max, preço delta).
- `checkout.quote` e `orders.create` validam opções e somam ao unitário.
- UI no produto: grupos com checkbox/radio.
- Carrinho: `selectedOptions[]` no item (quebra merge simples por productId).

### B. Horário de funcionamento

- Campos na loja: `opensAt`/`closesAt` por dia ou JSON de agenda.
- Marketplace filtra ou marca `storeOpen`.
- Checkout rejeita se loja fechada.

### C. Frete por zona / raio

- Regras por `storeId` + polígono ou raio km + faixas de valor.
- `checkout.quote` é a fonte da taxa; UI só mostra estimativa.
- Cupom “frete grátis” só se regra do cupom permitir.

### D. Multi-loja

- **Não** misturar itens de lojas no mesmo pedido (já é regra de domínio).
- UX: decisão explícita (feito) em vez de erro silencioso.
- Futuro opcional: múltiplos carrinhos por `storeId` (maior complexidade).

## Aceite P5 (parcial)

- [x] Multi-loja com escolha clara do usuário
- [x] Observação no produto → item do carrinho
- [x] Documentação do restante
- [ ] Schema + API de modificadores
- [ ] Horário de loja no marketplace
- [ ] Frete por zona no quote

## Próximo (P6)

Ops / go-live: staging, PIX produção, E2E, push device — ver `docs/GO_LIVE_PLAN.md`.
