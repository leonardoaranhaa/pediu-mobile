# Instrução técnica — fase Expo: operações reais de lojista e operação

## Objetivo

Substituir no cliente Expo/React Native os avisos, dados estáticos e ações demonstrativas por operações reais do backend Pediu, sem alterar o cliente Flutter preparado em `flutter_app/`. A fase deve preservar o sistema visual existente, os três temas e os contratos de segurança/idempotência já implementados.

## Escopo funcional

A implementação prioriza as áreas em que a interface atual ainda apresenta ações não conectadas: painel do lojista, catálogo e disponibilidade, clientes/fiado, divulgação do catálogo, pedidos e acompanhamento operacional. Cada ação deve fornecer feedback de carregamento, erro e sucesso, invalidar/refazer as queries relacionadas e respeitar o papel autenticado.

## Metodologia

1. Mapear textos como “será conectado”, “dados do backend” e handlers `onNotice` que não executam mutações.
2. Reutilizar os procedimentos tRPC existentes antes de criar novos endpoints.
3. Onde o contrato necessário não existir, adicionar um procedimento protegido com autorização no servidor, limite de payload e teste Vitest.
4. Remover mocks e números demonstrativos das telas alteradas; estados vazios devem ser informativos, não inventados.
5. Validar a cadeia completa: query/mutation → estado React Query → feedback visual → atualização de tela.
6. Executar `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, `git diff --check` e smoke test Expo Web.

## Contratos prioritários já disponíveis

| Área | Procedimentos | Comportamento esperado |
|---|---|---|
| Lojista | `stores.mine/create`, `products.mine/create/availability/storeOpen`, `orders.storeMine/status`, `sales.mine/create` | Dashboard e atalhos operacionais persistidos |
| Clientes | `clients.mine/create`, `credit.get/setLimit/block`, `ledger.mine/add` | Cliente, limite, bloqueio e lançamentos reais |
| Divulgação | `stores.mine`, `products.mine`, `marketplace.search/products` | Catálogo compartilhável com dados da loja |
| Cliente | `orders.mine/get/status`, `payments.createPix`, `experience.delivery.track` | Histórico, estado e pagamento persistentes |
| Entrega | `experience.delivery.assign/recordLocation/complete` | Atribuição, localização, transições idempotentes |
| Suporte | `experience.support.create/mine/messages` | Encaminhamento de pedido para suporte real |

## Critérios de aceite

A tela de lojista não deve depender de arrays estáticos para pedidos, clientes ou vendas. Catálogo, disponibilidade, abertura da loja e status de pedido devem atualizar o backend. Clientes e fiado devem exibir dados retornados por `clients.mine`, `credit.get` e `ledger.mine`. A ação de divulgação deve abrir ou copiar uma representação real do catálogo da loja, sem afirmar que é uma integração futura. O cliente deve exibir pedidos e timeline provenientes do servidor e permitir ações autorizadas de acompanhamento.

## Limitações preservadas

Compartilhamento nativo para redes sociais pode depender de APIs de plataforma; nesta fase o mínimo aceitável é gerar/copiar um link ou texto baseado na loja e seus produtos reais. Rastreamento em tempo real depende de chamadas periódicas/eventos já previstos no backend, sem prometer uma posição quando não houver localização persistida. Nenhuma operação financeira ou transição de pedido deve ser calculada apenas no cliente.
