# Reanálise do Pediu: mercado brasileiro, lacunas e próximos gates de Go-Live

**Data da análise:** 28/09/2026
**Fonte de código:** PR #7, branch `docs/go-live-plan`, commit `df7ad15188d6dce73de16ddaf741edc611f696b8` (`df7ad15`)
**Escopo:** comparação de cinco plataformas de delivery no Brasil, auditoria do código atual e priorização das próximas fatias do Go-Live.

> **Veredito:** o Pediu tem uma fundação estrutural sólida para cliente, lojista, entregador, marketplace, checkout, concorrência, segurança HTTP, suporte e UX. Porém, **não está READY para Go-Live comercial**. Os bloqueadores mais importantes não são cosméticos: estão em pagamento/reconciliação, estoque, serviceability, invariantes da entrega, recuperação de incidentes, suporte operacional e evidências externas.

## 1. Como a análise foi feita

- Revisão direta do repositório atual, incluindo `server/`, `drizzle/`, `app/`, `components/`, `scripts/go-live-*`, `tests/` e os documentos do PR #7.
- Matriz local registrada na auditoria: `pnpm test` com **35 arquivos e 150 testes aprovados**, além de `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados.
- Comparação independente de **iFood, Rappi, 99Food, aiqfome e Zé Delivery**, usando páginas oficiais, centrais de ajuda, termos, páginas de parceiros e, quando necessário, fontes jornalísticas/conteúdo de marca.
- Data de corte das fontes externas: **28/09/2026**.

A comparação não trata marketing como SLA. Cobertura, preço, comissão, tempo, entregadores, benefícios e categorias variam por endereço, cidade, loja, horário, estoque, contrato, campanha e modalidade logística.

## 2. O que o mercado estabeleceu como baseline

| Capacidade          | Expectativa prática observada                                                                                     | Consequência para o Pediu                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Disponibilidade     | A oferta real é calculada por endereço/CEP/bairro, não pela cobertura nominal da marca.                           | Resolver elegibilidade antes do checkout e explicar indisponibilidade/fallback.    |
| Checkout            | Item, frete/taxa, descontos, mínimo, pagamento e ETA precisam ser compreensíveis antes da confirmação.            | Decompor preço e gravar snapshot das regras usadas no pedido.                      |
| Fulfillment         | Entrega da loja, frota da plataforma, retirada e modalidades híbridas coexistem.                                  | Mostrar quem entrega, custo, prazo, rastreio e responsabilidade por modalidade.    |
| Operação do lojista | Catálogo, disponibilidade, horário, aceite, preparo, cancelamento, despacho, pós-venda e financeiro.              | Console operacional confiável, com notificações redundantes e pausa de item/loja.  |
| Entregador          | Aceite/recusa autônomos, oferta por proximidade/capacidade, localização, confirmação de coleta/entrega e suporte. | Reoferta, fallback, ETA honesto, segurança e regras de remuneração legíveis.       |
| Incidentes          | Atraso, item faltante, item incorreto, não entrega, cancelamento, crédito e estorno têm fluxos próprios.          | Incidente deve ser um domínio de primeira classe, não apenas uma mensagem de erro. |
| Confiança           | Código/prova de entrega, avaliações, age gate quando necessário, suporte contextual e matriz de responsabilidade. | Proteger cliente, lojista e courier contra disputas e fraude.                      |
| Retenção            | Cupons, créditos, pontos e assinaturas aparecem como diferenciais, mas são condicionais.                          | Primeiro tornar elegibilidade transparente; só depois escalar loyalty/assinatura.  |

### Padrões competitivos relevantes

- **iFood:** profundidade de Portal/Gestor para lojistas, logística híbrida, Sob Demanda, códigos de coleta/entrega, suporte contextual, mídia patrocinada e Clube. O rastreio completo depende da modalidade de entrega.
- **Rappi:** super-app multivertical, modalidades de frota própria/partner/retirada, assinatura Pro/Pro Black, Rappi Ads, métricas de operação e política formal de compensação.
- **99Food:** integração com mobilidade, pagamentos e entregas, operação agressiva de aquisição, gestor com estados/aceite/histórico e flexibilidade entre entrega 99Food e entrega própria.
- **aiqfome:** capilaridade local/interior, operação híbrida, Geraldo/GrandChef, suporte humano, avaliações separadas por produto/pedido/entrega e clube d+.
- **Zé Delivery:** verticalização de bebidas e ocasiões de consumo, disponibilidade por distribuidora/endereço, promessa de produto gelado, programa Zé Compensa e dualidade entre entregador do PDV e autônomo.

A conclusão é importante: **super-app, assinatura, Ads e promoções não são o núcleo mínimo do Go-Live**. O núcleo é concluir uma compra elegível, cobrar corretamente, operar o pedido, entregar com prova/rastreio adequado e resolver falhas com responsabilidade clara.

## 3. Lacunas P0 — corrigir antes de qualquer READY comercial

### P0.1 — Pagamento não fecha o ciclo financeiro

**Evidência no código:** `server/payments.ts:18-42` usa `PIX_PROVIDER ?? "manual"`; no modo manual, o fluxo apenas retorna `pending`. O webhook HMAC e idempotente atualiza principalmente `payments.status`/`transactionId`, mas não valida de forma completa valor, moeda e referência externa nem gera reconciliação em `financialLedger`, `commissionEntries`, `payouts` e `refunds`.

**Impacto:** existe uma fronteira técnica de webhook, mas não um pagamento comercial comprovado. Não há ciclo completo de refund, chargeback, comissão, repasse e divergência PSP × banco.

**Próxima fatia:** adaptador real por PSP; bloquear `COMMERCIAL_MODE` com provider manual; validar referência/valor/moeda/status; persistir payload/auditoria; criar outbox, reconciliação, refund, chargeback, comissão e payout idempotentes.

### P0.2 — Cancelamento não reverte pagamento liquidado nem fiado

**Evidência:** `server/routers.ts:887-919` cancela pagamento pendente, mas não abre refund para PIX já pago. No fiado, a compra incrementa saldo e grava ledger como `credit`, enquanto o cancelamento não cria reversão correspondente.

**Impacto:** saldo de fiado pode permanecer consumido e dinheiro liquidado pode não voltar ao cliente; pedido, pagamento e ledger divergem.

**Próxima fatia:** transação de cancelamento/refund por estado; `refund_pending` explícito; reversão fiado no ledger; refund PSP idempotente e reconciliação antes de liberar o caso.

### P0.3 — Não há estoque quantitativo nem reserva atômica

**Evidência:** `products` possui apenas disponibilidade booleana/int (`drizzle/schema.ts:74-85`). O checkout consulta disponibilidade antes da transação, mas não reserva/decrementa quantidade em `server/db.ts:1607-1631`.

**Impacto:** compras simultâneas podem vender o mesmo item; não há reserva expirada, baixa de estoque ou compensação de cancelamento.

**Próxima fatia:** estoque disponível/reservado, movimentos, reserva transacional com condição `available >= quantity`, liberação por cancelamento/timeout e smoke concorrente de overselling.

### P0.4 — Mutation genérica permite bypass da operação de entrega

**Evidência:** `server/routers.ts:874-972` permite ao lojista avançar qualquer transição aceita pela máquina de estados. O fluxo pode chegar a `A caminho` ou `Entregue` sem exigir assignment, localização, prova de entrega ou `delivery.complete`.

**Impacto:** o pedido pode ficar “entregue” sem courier, ETA, handoff ou confirmação real; timeline, avaliação e disputa financeira ficam inconsistentes.

**Próxima fatia:** separar transições por papel e modo (`delivery`/`pickup`); lojista avança no máximo até `Pronto` para delivery; `A caminho` exige assignment/location; `Entregue` exige assignment e confirmação autorizada.

### P0.5 — Health não prova readiness do banco

**Evidência:** `server/_core/index.ts:73-75` responde `{ ok: true }` sem consultar banco. Algumas consultas retornam lista vazia quando `getDb()` não está disponível. O deployment smoke pode, portanto, aprovar um processo vivo, mas incapaz de operar.

**Impacto:** tráfego pode ser aceito por uma instância degradada, exibindo marketplace vazio ou estado incorreto.

**Próxima fatia:** separar liveness de readiness; `/readyz` deve validar DB, migrations críticas e dependências necessárias ao modo; endpoints críticos devem falhar explícitamente, não mascarar indisponibilidade como `[]`.

### P0.6 — Avaliações podem ser criadas pelo papel errado e com alvo inválido

**Evidência:** `server/experience-router.ts:44-46` exige pedido entregue, mas `getOrderForUser` admite cliente, dono da loja ou courier atribuído. Não há verificação de que o autor é `orders.customerId`, que `productId` pertence ao pedido ou que há courier para `target = courier`.

**Impacto:** reputação e dados podem ser corrompidos por avaliações não elegíveis ou atribuídas ao produto/courier errado.

**Próxima fatia:** autorizar somente o cliente; validar target, item e assignment; adicionar FK/constraints e unicidade adequada; incluir testes cross-role.

### P0.7 — Operação de incidentes e suporte ainda não é um fluxo de Go-Live

As plataformas comparadas possuem caminhos explícitos para atraso, item incorreto, não entrega, cancelamento, crédito e estorno, mesmo que com escopos diferentes. O Pediu possui tickets e suporte estrutural, mas a auditoria não encontrou uma política comercial completa que una evidência, responsável, SLA, crédito/estorno e comunicação proativa por pedido.

**Próxima fatia:** entidade de incidente ligada ao pedido, categorias, fotos/evidências, responsável por modalidade, SLA, decisão de crédito/estorno, protocolo e trilha operacional.

### P0.8 — Despacho precisa lidar com ausência de oferta

Todas as plataformas deixam claro que disponibilidade de courier varia por densidade, demanda, distância, clima e horário. O Pediu possui fluxo de courier, mas o Go-Live não pode depender de uma frota presumidamente disponível.

**Próxima fatia:** reoferta, fallback para entregador da loja ou retirada, ETA probabilístico, alertas de risco e compensação/cancelamento quando a oferta não se materializar.

## 4. Lacunas P1 — necessárias para um piloto realmente utilizável

1. **Rate limit distribuído:** `server/_core/security.ts` usa `Map` em memória; funciona como barreira local, mas perde estado no restart e não protege proporcionalmente em escala horizontal. Evoluir para Redis/API gateway e quotas por usuário/IP/custo.
2. **Push confiável:** `server/push.ts` envia diretamente ao Expo e engole falhas. Falta outbox, retry/backoff, receipts e remoção de tokens inválidos.
3. **Tracking real:** `app/order/[orderId]/tracking-map.tsx` faz polling, mas a tela chamada mapa ainda é um placeholder visual; falta mapa/marcador, idade da posição, estado stale/offline e evidência de background location em Android/iOS.
4. **Ofertas expiradas:** `listPendingDeliveryOffers` filtra `status = pending`, mas não filtra `expiresAt > NOW()` na leitura; falta expiração idempotente/worker.
5. **LGPD incompleta:** exportação não inclui todas as relações, como itens, chats, reviews, locations, tokens, courier profile e anúncios; `requestDeletion` apenas cria ticket, sem workflow de anonimização/deleção e SLA.
6. **Serviceability e pickup:** o domínio declara `deliveryMode`, mas checkout efetivo não recebe o modo, sempre soma `store.deliveryFee` e não calcula área/distância. Modelar delivery, pickup, cobertura e snapshot de regra no servidor.
7. **N+1 e paginação:** URLs assinadas podem ser geradas item a item; listagens usam `offset`/caps fixos. Adotar presign em lote/cache, cursor pagination e índices alinhados.
8. **Offline/reconexão:** telas exibem erro, mas não há fila de mutation/reconciliação global para rede ruim ou suspensão do app. Adicionar retry apenas a operações idempotentes e UX de conectividade.
9. **Histórico/outbox:** mudanças de status, eventos e push são chamadas separadas; falha do evento pode ser apenas `console.warn` enquanto a mutation retorna sucesso. Persistir outbox na mesma transação e processar com retry.
10. **Token push:** `registerPushToken` pode reassociar token apresentado por outro usuário; falta instalação/dispositivo, rotação, revogação no logout e limpeza por receipt.
11. **Financeiro/auditoria:** tabelas de ledger/comissão/payout/refund existem, mas a auditoria encontrou uso runtime incompleto. Schema não é evidência de operação financeira.

## 5. P2 — diferenciação e escala depois dos P0/P1

- Centralizar o domínio de estados; há risco de duplicação entre `server/domain/order-state.ts` e `server/order-state.ts`.
- Dividir o `server/db.ts`, atualmente concentrando catálogo, pedidos, fiado, delivery, chat, suporte, pagamentos, notificações e exportação.
- Criar busca com full-text/ranking/cache e disponibilidade explícita, em vez de depender de `LIKE` e offset em crescimento.
- Governar Ads IA com quota distribuída, custo por modelo, moderação, versão de prompt/modelo, auditoria de publicação e retenção de assets.
- Exibir avaliações agregadas por loja/produto/courier com moderação e denúncia.
- Completar métricas externas, dashboards, alertas, retenção e monitoramento de PSP, push, DB e backup.
- Separar orgânico de patrocinado, explicar fatores de ranking e rotular mídia paga.
- Criar benefícios/loyalty simples e verificáveis antes de uma assinatura complexa.

## 6. O que o Pediu já faz bem

- Base multi-papel com cliente, lojista e entregador, preservada no merge do PR #7.
- Checkout server-side, chave de idempotência e recuperação de corridas concorrentes.
- Transições e conclusão de entrega condicionais/idempotentes, com E2E de courier.
- HMAC e idempotência para webhook de pagamento, sem alegar PSP real homologado.
- CORS, cookies, OAuth state/replay, storage namespace/traversal e limites de voz/payload endurecidos.
- Cupons, suporte, chat, avaliações, privacidade, tema persistido, mascote e estúdio de anúncios IA integrados à experiência.
- Preflight Expo SDK 54 e export web validados estruturalmente; a evidência física Android/iOS continua pendente.
- Stress read-only e deployment smoke reais no ambiente de validação, com a limitação de que ainda não cobrem pagamento real, refund, estoque, push real, produção definitiva ou dispositivos físicos.

## 7. Roadmap vertical recomendado para o PR #7

A regra do projeto permanece: **cada fatia termina com deployment smoke e stress; se qualquer gate falhar, corrigir antes de avançar.** O stress atual de health/marketplace deve ser complementado por cenários de mutation controlada conforme as capacidades forem implementadas.

| Ordem | Fatia                               | Critério mínimo antes da seguinte                                                                                                                  |
| ----: | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | Pagamento comercial e reconciliação | PSP/adapter, referência/valor/moeda, webhook, refund, chargeback, ledger, comissão, payout, cancelamento pago/fiado e E2E de replay/timeout/retry. |
|     2 | Estoque, serviceability e pickup    | Reserva quantitativa atômica, área atendida, delivery/pickup, snapshot de taxa/preço, liberação de reserva e teste concorrente de overselling.     |
|     3 | Máquina de estados e entrega        | Remoção de bypass, assignment/location/prova de entrega obrigatórios, expiração de offers e E2E cliente–lojista–courier.                           |
|     4 | Incidentes, suporte e comunicação   | Outbox de eventos/push, retries/receipts, incidentes com SLA, crédito/estorno e suporte contextual por pedido.                                     |
|     5 | Tracking e dispositivo              | Mapa/marker ou decisão formal de polling, posição stale/offline, foreground/background, push real e evidência Android/iOS.                         |
|     6 | Autorização e privacidade           | Reviews por cliente/alvo, exportação completa, deleção/anonimização, retenção de locations e auditoria financeira/admin.                           |
|     7 | Escala e piloto                     | Redis/gateway, cursor/presign/cache, readiness real, dashboards/alertas, offline/retry e teste sob perfil do piloto.                               |
|     8 | Homologação externa/final           | PSP/CNPJ, OAuth, push, storage, backup/restore, domínios, staging/produção definitivos, rollback, lojas e piloto controlado.                       |

## 8. Estado honesto do Go-Live

O PSP/PIX real continua pendente por CNPJ, conforme definido pelo usuário. Além dele, a análise confirma que ainda não devem ser marcados como concluídos:

- refund, chargeback e reconciliação financeira reais;
- CNPJ/conta empresarial e contrato do PSP;
- staging/produção definitivos, domínio, TLS, rollback e banco de produção;
- OAuth real em domínio definitivo;
- e-mail e push reais, receipts e dispositivos Android/iOS;
- storage externo e publicação/retention de assets IA/voz;
- backup automático, retenção, RPO/RTO e restore operacional contínuo;
- observabilidade externa com alertas;
- suporte operacional com SLA comercial e fluxo completo de incidentes.

O PR #7 deve continuar aberto e o Go-Live comercial deve continuar **bloqueado**, mesmo com os checks de CI, deployment smoke e stress de validação verdes.

## 9. Fontes externas consultadas

As páginas abaixo foram consultadas em 28/09/2026. Preços, planos, cidades e benefícios devem ser reconfirmados no contrato e no endereço real antes de decisões comerciais.

### iFood

- [Como é o modelo de negócio do iFood](https://institucional.ifood.com.br/institucional/como-e-o-modelo-de-negocio-do-ifood/)
- [iFood para Clientes](https://institucional.ifood.com.br/comunidade/clientes/)
- [Como funciona a entrega do iFood](https://institucional.ifood.com.br/ajuda/como-funciona-a-entrega-do-ifood/)
- [Diferença entre Portal do Parceiro e Gestor de Pedidos](https://blog-parceiros.ifood.com.br/diferenca-portal-do-parceiro-e-gestor-de-pedidos/)
- [Planos iFood para negócios parceiros](https://parceiros.ifood.com.br/restaurante/planos-ifood)
- [iFood Ads](https://ads.ifood.com.br/v2/landing)
- [Ajuda do entregador e Score](https://entregador.ifood.com.br/ajuda/)

### Rappi

- [Rappi para restaurantes](https://merchants.rappi.com/pt-br/restaurants)
- [Métodos de logística](https://merchants.rappi.com/pt-br/metodos-de-conformidade)
- [Termos da plataforma Rappi — Brasil](https://legal.rappi.com.co/brazil/termos-e-condicoes-de-uso-da-plataforma-rappi/)
- [Rappi Pro Brasil](https://pro.rappi.com/brasil)
- [Política de compensações e reembolsos](https://legal.rappi.com.co/brazil/politica-de-compensacoes-e-reembolsos/)

### 99Food

- [99Food para restaurantes](https://merchant.99app.com/)
- [Entendendo as cobranças da 99Food](https://99app.com/99food/restaurantes/guias/entendendo-as-cobrancas-da-99food/)
- [Novo gestor de pedidos](https://99app.com/99food/restaurantes/guias/nova-versao-do-portal-guia-do-novo-gestor-de-pedidos/)
- [Canais de relacionamento da 99Food](https://99app.com/ajuda/99food/canais-de-relacionamento-de-99/)
- [Termos do entregador parceiro](https://termos.99app.com/legal/termos/termos-de-uso-entregador-parceiro-99food/)

### aiqfome

- [aiqfome](https://aiqfome.com/)
- [Portal de parceiros](https://www.parceiros.aiqfome.com/)
- [Como acompanhar o pedido](https://aiqfome.zendesk.com/hc/pt-br/articles/11340927913243-como-acompanho-meu-pedido)
- [Quero falar com um ninja](https://aiqfome.zendesk.com/hc/pt-br/articles/11340724396955--quero-falar-com-um-ninja)
- [Quero cancelar meu pedido](https://aiqfome.zendesk.com/hc/pt-br/articles/11340970065947-quero-cancelar-meu-pedido-O-que-fazer)
- [Clube d+ e termos](https://assine-dmais.aiqfome.com/termos-de-uso)

### Zé Delivery

- [Zé Delivery](https://www.ze.delivery/)
- [Cadastro de parceiro Seu Zé](https://seu.ze.delivery/cadastro-parceiro)
- [Cidades atendidas](https://www.ze.delivery/cidades-atendidas)
- [Tempo de entrega](https://ze-delivery-abi.zendesk.com/hc/pt-br/articles/49813670404113-Qual-%C3%A9-o-tempo-de-entrega)
- [Problema durante pedido ou entrega](https://ze-delivery-abi.zendesk.com/hc/pt-br/articles/49814127231761-Tive-um-problema-durante-meu-pedido-ou-entrega-O-que-fa%C3%A7o)
- [Termos do Zé Entregador](https://entregador.ze.delivery/termos-de-uso/index.html)
- [Zé Compensa](https://ze-delivery-abi.zendesk.com/hc/pt-br/articles/49814299163665-O-que-%C3%A9-o-Z%C3%A9-Compensa)

## Conclusão executiva

O Pediu não precisa copiar todos os recursos dos grandes apps para ser útil. Precisa primeiro **ser previsível quando algo dá errado**: não aceitar pedido inviável, não vender estoque inexistente, não liberar entrega sem handoff, não perder dinheiro no cancelamento, não esconder taxa, não depender de push best-effort e não deixar cliente/lojista/courier sem suporte.

A melhor tese competitiva para o próximo ciclo é **confiança operacional local + transparência econômica + logística híbrida**, preservando o diferencial já construído de personalização, mascote e anúncios IA. Isso deve ser implementado em fatias verticais, sempre com stress e deployment smoke antes da próxima etapa, e sem transformar o PR #7 em READY enquanto as evidências externas permanecerem pendentes.
