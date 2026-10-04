# Instrução técnica — inventário e reserva atômica no PR #7

## Objetivo

Fechar a lacuna P0 de estoque quantitativo e impedir overselling quando vários clientes tentam comprar a última unidade do mesmo produto. A implementação deve permanecer compatível com o catálogo existente: produtos legados continuam sem controle quantitativo até que o lojista ative `inventoryTracked`.

## Implementação

- `drizzle/0028_inventory_reservation.sql` adiciona `inventoryTracked`, `stockQuantity` e `reservedQuantity` em `pediu_products`, além do índice composto `pediu_products_inventory_idx`.
- `server/domain/inventory.ts` concentra o cálculo de disponibilidade, os ajustes por transição terminal e a validação de quantidades inteiras limitadas.
- `server/db.ts` reserva unidades dentro da mesma transação da criação do pedido, com `UPDATE ... WHERE stockQuantity - reservedQuantity >= quantidade`; também libera reservas em cancelamento e consome estoque na transição `A caminho → Entregue`.
- O marketplace e a cotação não expõem produtos controlados sem quantidade disponível. O lojista pode configurar o controle e as quantidades por procedimento protegido.
- `scripts/go-live-inventory.ts` prova overselling e liberação com 12 pedidos concorrentes, MariaDB real e bundle de produção.
- O E2E operacional existente passou a usar estoque controlado e confirma consumo após a entrega.

## Evidências verificadas

- Migration atual validada em banco temporário limpo: todas as migrations aplicaram, as três colunas existem e o índice `pediu_products_inventory_idx` existe; o banco temporário foi removido ao final.
- MariaDB real de validação: migration 0028 registrada no journal; banco principal permaneceu acessível após a verificação; zero fixtures `ci-inventory-*` e zero produtos `Produto Inventário ...` após os smokes.
- Smoke de inventário no bundle `http://127.0.0.1:3004`: 3 execuções; cada rodada disparou 12 pedidos simultâneos para 1 unidade, aprovou exatamente 1 reserva, rejeitou 11 por `Estoque insuficiente` e confirmou liberação após cancelamento.
- E2E operacional real: courier onboarding, oferta, aceitação, GPS, tracking, conclusão idempotente e consumo de estoque aprovados; após `Entregue`, `stockQuantity=0` e `reservedQuantity=0`.
- Deployment smoke: health 200, readiness 200, marketplace 200, CORS exato e métricas protegidas.
- Stress read-only: 120 requests / 12 workers; `p50=24,8 ms`, `p95=48,2 ms`, máximo `87,0 ms`, erro `0,0000`.
- Matriz local final: 39 arquivos de teste, 186 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint` e `git diff --check` aprovados. Prettier foi executado nos arquivos suportados; migration SQL foi validada por aplicação limpa, não pelo parser do Prettier.

## Limites e pendências

Esta fase fecha a reserva/consumo atômicos no domínio de estoque, mas não fecha todo o fulfillment comercial. Ainda devem ser tratados serviceability por endereço, pickup, substituições, expiração/reconciliação de reservas abandonadas e políticas de disponibilidade por loja.

O PSP/PIX real permanece pendente por CNPJ, credenciais, configuração de aplicação, URL HTTPS definitiva, webhook real e homologação autorizada; nenhum pagamento real foi executado. Também continuam pendentes OAuth/e-mail/push reais, storage externo, observabilidade externa, backup operacional contínuo, staging/produção definitivos, dispositivos físicos Android/iOS e publicação nas lojas. Portanto, o Go-Live comercial e o estado READY do PR #7 permanecem bloqueados.
