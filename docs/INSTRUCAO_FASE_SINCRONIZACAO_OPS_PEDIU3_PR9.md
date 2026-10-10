## Implementação desta rodada — 07/10/2026

- Criado `components/pediu-ops-ui.tsx` com `OpsShell`, `OpsHeader`, `OpsMetric`, `OpsCard`, `OpsBadge`, `OpsButton`, `OpsDock` e linhas operacionais reutilizáveis.
- Refeito `app/courier/index.tsx` no visual Radar/Motoboy: status online/offline, ofertas Flash, aceite/recusa, entrega ativa, compartilhamento GPS, conclusão e dock Cliente/Radar continuam reais.
- Refeito `app/seller/index.tsx` no visual Cozinha: status aberto/fechado, métricas de fila/fogo/vendas, grupos Na fila/No fogo/Na bancada, ações de pedido e atalhos para catálogo, anúncios, entregas e configurações continuam ligados ao backend.
- Refeitos `app/seller/orders.tsx` e `app/seller/delivery.tsx` com cards, badges, estados e dock do Pediu3; transições, atribuição, ETA, GPS e conclusão permanecem nos procedimentos tRPC existentes.
- O visual não inventa ganhos do entregador: como o backend atual ainda não expõe repasse/ganho por corrida, o Radar mostra o total persistido do pedido com o rótulo explícito `Pedido`, e as métricas mostram ofertas/rotas reais.

### Evidências

- `pnpm check`: aprovado.
- Testes focados courier/entrega/pedidos/seller: **27 testes aprovados**.
- `pnpm test`: **51 arquivos / 254 testes aprovados**; warnings existentes de push/outbox em mocks, sem falhas.
- `pnpm build`: aprovado (`dist/index.js` 338,8 kB).
- `pnpm lint`: aprovado sem warnings do código da fase; permanece apenas o warning de módulo ESM já existente do `eslint.config.js`.
- Prettier e `git diff --check`: aprovados.
- `npx expo export --platform web`: aprovado; **115 arquivos** exportados.
- Preview Expo Web público: `/courier` e `/seller` renderizados; estados anônimos verificados, console sem erro visível e overflow horizontal medido como `false`.
- Deployment smoke local: `health=200`, `readyz=200`, marketplace `200`, CORS exato.
- Deployment smoke HTTPS temporário: `health=200`, `readyz=200`, marketplace `200`, CORS exato.
- Stress read-only local: **120 requisições / concorrência 12**, erro `0%`, p95 `30,2 ms`, máximo `63,1 ms`.
- Stress read-only HTTPS temporário: **120 requisições / concorrência 12**, erro `0%`, p95 `79,7 ms`, máximo `145,9 ms`.

A validação de estados autenticados/aprovados depende de sessão OAuth real no navegador; não foi criado bypass de autenticação para produzir dados fictícios no preview.
