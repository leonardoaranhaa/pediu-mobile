# Fase — Pediu Mercado + Pediu Entregas

## Objetivo

Transformar o vertical `Mercado` em um fluxo real de compras locais para cidades pequenas: o cliente monta a sacola com produtos por unidade, quilo ou embalagem; o mercado separa o pedido; e um entregador parceiro retira e entrega no endereço salvo.

## Implementação

- `app/market.tsx`
  - Catálogo real via `pediu.marketplace.search({ vertical: "market" })`.
  - Busca textual, categorias derivadas do catálogo, estados de loading/erro/vazio e cards fotográficos.
  - Preço exibido com a unidade de venda real (`un`, `kg`, `pack`) e entrada direta na sacola persistida.
  - Atalho de sacola com total local apenas como prévia; o total definitivo continua vindo do quote server-side.
  - Comunicação explícita do handoff: mercado separa, Pediu Entregas retira e entrega.

- `app/checkout.tsx`
  - Sacola de mercado é delivery-first: retirada fica indisponível no cliente.
  - Endereço salvo e georreferenciado continua obrigatório para a cotação.
  - O cliente envia ao backend o modo efetivo de entrega, e não um total calculado localmente.

- `server/routers.ts`
  - `checkout.quote` e `orders.create` rejeitam `pickup` para lojas `kind = market`.
  - A regra é server-side e não pode ser contornada por payload manual.

- Operação
  - `server/experience-router.ts` expõe o tipo da loja na fila de entrega.
  - `server/db.ts` expõe o tipo da loja nas ofertas do radar courier.
  - `app/seller/orders.tsx` e `app/seller/delivery.tsx` identificam Mercado e comunicam a separação/coleta.
  - `app/courier/index.tsx` identifica ofertas de Mercado e orienta a retirada no mercado e entrega residencial.

## Validações executadas

- `pnpm check` — aprovado.
- `pnpm lint` — aprovado; permanece apenas o aviso de módulo ES do `eslint.config.js` já existente.
- `pnpm test` — **51 arquivos, 255 testes aprovados**.
- Testes focados Mercado/carrinho/courier/fila — **37 testes aprovados**.
- `pnpm build` — aprovado (`dist/index.js`).
- Expo Web export — aprovado; rotas `/market`, `/checkout`, `/seller/delivery` e `/courier` incluídas no bundle.
- Bundle web comprimido medido em aproximadamente 895 KB.

## Limites comerciais preservados

- Não foi criado pagamento externo novo; Mercado Pago/PIX continuam dependentes da configuração de PSP já existente.
- A entrega real depende de endereço salvo, serviceability, estoque, fila e atribuição courier já implantados.
- O total, taxa, cupom, gorjeta e snapshot do pedido continuam sendo recalculados e persistidos no backend.

## Smoke vertical real

O comando `pnpm go-live:flash-loyalty` foi executado contra a API real em `http://127.0.0.1:3000` com MySQL. O smoke comprovou filtro `Flash + Mercado`, quote Flash com taxa override de R$ 2,50 e gorjeta de R$ 5, bloqueio delivery-first para pickup, snapshots server-side, conclusão courier com settlement de gorjeta, crédito Club em delivery e pickup, resgate concorrente idempotente e bloqueio de replay cross-user. Resultado: `ok=true`, pedidos temporários concluídos e saldo Club após resgate de 142 pontos.

A verificação posterior no MySQL encontrou zero resíduos para os prefixos do smoke em usuários, lojas, produtos, pedidos, ledger Club e settlements.
