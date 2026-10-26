# Relatório de auditoria Go Live público — Pediu Mobile / PR #9

**Data:** 14/10/2026  
**Branch auditado:** `cursor/phase1-hybrid-ux-a9df`  
**Escopo:** cliente, prestador, motoboy, autenticação, pagamentos, estoque, notificações, storage, CI/CD, WebDev persistente e operação em escala.

## Resumo executivo

O PR #9 tem uma base técnica consistente para continuar a homologação: pedidos recalculam o total no servidor, estoque é reservado em transação, idempotência está presente no checkout e em operações financeiras, o webhook PIX valida assinatura e o fluxo cliente–prestador–motoboy possui cobertura vertical automatizada. A auditoria não encontrou evidência de SQL injection direta, bypass de autorização por `storeId` no checkout ou segredo versionado.

**Veredito: solicitar correções / NÃO classificar como pronto para Go Live comercial público.**

A razão não é a UI nem o onboarding. Os bloqueadores estão nas fronteiras que ainda dependem de operação real: fechamento financeiro completo, OAuth com proteção contra login CSRF e revogação, garantia de workers em hospedagem Autoscale, reconciliação paginada e homologação de PSP, domínio, backups, observabilidade, push e dispositivos reais.

> Os smokes locais, o mock de Mercado Pago e o preview WebDev comprovam contratos técnicos; não comprovam cobrança PIX real, refund real, chargeback, repasse, webhook público ou publicação em loja.

## Classificação Go Live

| Área | Situação | Impacto |
|---|---|---|
| Cliente → prestador → motoboy | **PASS técnico** | Jornada vertical automatizada e testes de autorização existentes. |
| Checkout, preço e estoque | **PASS técnico** | Total e preço são recalculados pelo servidor; reserva é transacional. |
| Webhook PIX | **PASS parcial** | HMAC, referência, valor, moeda e idempotência estão cobertos; depende do PSP real. |
| Refund, chargeback e reversão contábil | **BLOCKED P0 comercial** | O ciclo financeiro não está fechado para operação pública. |
| OAuth Web e APK | **BLOCKED P1 de segurança/homologação** | Não há nonce/state correlacionado no servidor nem revogação imediata. |
| Workers de outbox/expiração | **BLOCKED P1 operacional** | Timers residentes não têm garantia de execução no Autoscale scale-to-zero. |
| Reconciliação | **BLOCKED P1 financeiro** | Há limites fixos sem paginação completa e sem correção automática de divergência. |
| CI e smoke operacional | **PASS de engenharia** | Workflows e gates são abrangentes, mas não substituem credenciais/homologação externa. |
| Infraestrutura comercial | **PENDENTE externo** | PSP/CNPJ, domínio/TLS, backups, alertas, push e EAS/Play ainda precisam de evidência real. |

## Achados críticos — corrigir antes do público

### P0-01 — O ciclo financeiro público ainda não trata refund/chargeback como estado operacional completo

**Evidência:**

- `server/payment-webhook.ts:7-13` aceita somente `pending`, `paid`, `failed` e `cancelled`.
- `server/payment-webhook.ts:71-80` transforma apenas `approved`, `rejected`, `cancelled` e estados pendentes; estados posteriores do PSP, como reembolso ou chargeback, são ignorados com HTTP 200 em `server/payment-webhook.ts:190-193`.
- `server/db.ts:3773-3854` cria refunds de forma idempotente e limita oversubscription com lock, mas `server/db.ts:3857-3881` apenas atualiza a linha do refund.
- Não existe, nesse caminho, lançamento compensatório idempotente no ledger, reversão de comissão/payout ou transição do pedido após refund confirmado.

**Impacto:** o Pediu pode mostrar um pagamento confirmado enquanto a devolução, chargeback ou reversão financeira não chega ao livro contábil e aos repasses. Isso cria risco de saldo incorreto, dupla liberação de dinheiro e divergência entre PSP, pedido e ledger.

**Correção exigida:**

1. Modelar estados canônicos de refund, chargeback e disputa e mapear os eventos reais do PSP.
2. Processar esses eventos por uma tabela de eventos idempotente, validando valor, moeda, referência e transação.
3. Criar lançamentos de reversão no ledger, comissão e payout com uma chave única por evento.
4. Definir o estado visível do pedido e o tratamento de entrega quando o pagamento for revertido.
5. Homologar com credencial de teste real do PSP e webhook HTTPS público antes de liberar `COMMERCIAL_MODE`.

**Observação:** a base de refund e reconciliação é tecnicamente útil e bem testada com mock; ela não deve ser descrita como homologação comercial.

### P1-01 — OAuth não possui nonce/state correlacionado e revogação imediata de sessão

**Evidência:**

- `constants/oauth.ts:88-101` envia como `state` apenas Base64 do `redirectUri`; não há nonce aleatório persistido nem vínculo com uma tentativa iniciada pelo usuário.
- `server/_core/sdk.ts:316-344` aceita e decodifica o redirect URI por formato/protocolo, mas não valida um nonce emitido pelo servidor.
- `server/_core/oauth.ts:113-155` e `159-201` trocam o código e criam a sessão sem comparar o callback com um state armazenado.
- `server/_core/sdk.ts:183-195` emite JWT com validade padrão de um ano; `server/_core/oauth.ts:204-218` limpa o cookie, mas não revoga o bearer token que já foi emitido.

**Impacto:** aumenta o risco de login CSRF e de uma sessão roubada continuar válida até a expiração. O fluxo real de login pode funcionar e ainda assim não estar endurecido para exposição pública.

**Correção exigida:**

- Gerar nonce/state aleatório no servidor ou em armazenamento seguro de curta duração, com TTL e uso único.
- Associar o state ao redirect URI permitido, plataforma e tentativa de login; rejeitar callbacks sem correlação.
- Restringir redirect URIs a uma allowlist por ambiente, em vez de aceitar qualquer URL HTTPS válida.
- Adicionar `jti`/sessão persistida ou denylist curta para revogação de logout, troca de senha e incidente.
- Manter o token nativo em SecureStore, reduzir a validade e cobrir replay, callback inválido e logout em testes de integração.

### P1-02 — Workers residentes não têm garantia de execução no hosting Autoscale

**Evidência:**

- `server/_core/index.ts:125-132` inicia sweeper de ofertas, expiração de estoque, outbox de notificações e limpeza de rate limits quando o processo sobe.
- `server/notification-outbox-worker.ts:94-112` depende de `setInterval` e `unref()` para processar a fila.
- Os sweepers de dispatch e inventário usam o mesmo padrão de timer residente.

**Impacto:** no modo Autoscale, instâncias podem ser congeladas ou removidas quando não há requisição. Notificações, expiração de reserva e reoferta de delivery podem atrasar ou depender de uma nova requisição. Com múltiplas instâncias, cada processo também executa seu próprio timer.

**Correção exigida:** escolher e documentar uma topologia antes do público:

- **WebDev Reserved Hosting** para manter um processo único 24/7, com atenção ao limite de 1 vCPU/512 MB; ou
- jobs/cron externos idempotentes que acionem endpoints protegidos e observem a fila; ou
- um worker dedicado com lock distribuído e métricas de atraso.

A implementação já usa locks/condições no banco em partes importantes, o que reduz duplicidade, mas isso não substitui garantia de execução nem alerta de backlog.

## Achados maiores — corrigir antes de escalar

### P1-03 — Reconciliação é bounded, mas pode declarar execução concluída sem cobrir todo o período

**Evidência:** `server/db.ts:3904-3917` rejeita mais de 500 registros recebidos; `server/db.ts:4038-4054` consulta no máximo 500 transações internas e não pagina.

**Impacto:** em um período com mais de 500 transações, divergências posteriores podem ficar fora da execução. O run pode terminar como `completed` sem significar cobertura total.

**Correção:** paginação por cursor/ID, contagem total esperada, marcador de cobertura do período, retry seguro e status `partial` quando o lote não representar o intervalo completo.

### P1-04 — Oversubscription de refunds pode reaparecer após mais de 100 refunds parciais

**Evidência:** `server/db.ts:3804-3808` lê os refunds anteriores com `.limit(100)` antes de somar em `server/db.ts:3809-3815`.

**Impacto:** uma conta com mais de 100 refunds parciais pode ter o valor já devolvido subestimado, permitindo solicitar valor acima do pagamento confirmado.

**Correção:** somar no banco (`SUM`) dentro da mesma transação com lock, ou remover o limite da consulta mantendo uma proteção de volume. Adicionar teste com 101+ refunds parciais concorrentes.

### P1-05 — `readyz` confirma banco/migrations/tabelas, mas não representa prontidão comercial

**Evidência:** `server/_core/readiness.ts:71-142` valida banco, journal e tabelas. `server/_core/env.ts:10-22` exige apenas app ID, JWT, banco, origens e observabilidade no boot de produção. PSP, webhook, OAuth, e-mail, storage, push, backup e alertas ficam fora do endpoint.

O checker `scripts/go-live-readiness.ts` possui checks adicionais, mas isso cria duas definições de “ready”.

**Impacto:** uma implantação pode responder HTTP 200 em `/api/readyz` e ainda não aceitar pagamento real, envio de e-mail ou operação de notificações. Health/readiness não deve ser usado sozinho para liberar tráfego comercial.

**Correção:** separar explicitamente `liveness`, `readiness técnica` e `commercial readiness`, ou fazer o deployment gate executar o checker completo com política de bloqueio por ambiente. Não colocar secrets nos logs nem retornar detalhes sensíveis.

### P1-06 — Limites de concorrência de IA/voz são locais ao processo

**Evidência:** `server/_core/security.ts:41-81` mantém buckets de rate limit/concurrency em `Map` na memória. Os endpoints de anúncio e voz usam `withConcurrencyLimit` em `server/routers.ts:694-707` e `1516-1521`/`1571-1575`.

**Impacto:** em múltiplas instâncias, cada pod pode executar o limite completo e multiplicar custo/pressão sobre os provedores. O rate limit de negócio distribuído cobre parte das mutações, mas o semáforo de concorrência não é distribuído.

**Correção:** semáforo distribuído ou limite no gateway/provedor, com budget por usuário/loja e métricas de rejeição. Se a operação ficar em Reserved single-instance, documentar essa premissa e monitorar saturação.

### P1-07 — URLs assinadas de imagens são geradas em loop no marketplace

**Evidência:** `server/routers.ts:214-226`, `228-266` e `268-296` chamam `storageGetSignedUrl` individualmente para cada item retornado.

**Impacto:** uma busca de 50 itens pode gerar até 50 chamadas de storage por resposta, aumentando latência e custo e criando um gargalo público de leitura.

**Correção:** retornar URLs públicas/cacheáveis quando o asset for público, assinar em lote, cachear por chave/TTL ou mover a resolução para o cliente com uma política explícita. Medir p95 com 50 itens e storage indisponível.

## Achados menores e de manutenção

### P2-01 — Escrita de `lastSignedIn` em toda requisição autenticada

`server/_core/sdk.ts:250-263` chama `upsertUser` em cada autenticação, e `server/db.ts:667-704` atualiza a linha do usuário. Isso gera write amplification e contenção desnecessária em endpoints de leitura. Atualizar com janela mínima, por exemplo uma vez por hora, preservando o login inicial e a auditoria real.

### P2-02 — Registro manual de vendas aceita `customerId` opcional sem validação de vínculo

`server/routers.ts:1484-1498` valida o dono da loja, mas grava o `customerId` recebido sem confirmar que o cliente pertence à loja. Como o registro não é o checkout e não altera o ledger de fiado, o risco imediato é de integridade/relatório, não de autorização do pedido. Validar o vínculo quando `customerId` for informado e limitar o valor monetário.

### P2-03 — Push considera token qualquer string com dez caracteres

`server/routers.ts:1583-1591` valida tamanho e plataforma, mas não o formato do token Expo/APNs/FCM. Isso pode gerar retries inúteis no outbox. Validar formato por plataforma, tratar token inválido como descartável e registrar motivo operacional.

### P2-04 — Endpoint mobile usa código OAuth em query string

`server/_core/oauth.ts:159-201` recebe `code` e `state` por GET. O código é de uso único e possui TTL do provedor, mas pode aparecer em logs de proxy. Preferir POST/fragmento seguro quando o provedor permitir e aplicar redaction de query em observabilidade.

## Pontos positivos

- `server/routers.ts:955-1040` valida loja aberta, vertical Mercado delivery-first, endereço autorizado, serviceability, produto pertencente à loja, preço atual, cupom, taxa, gorjeta e total calculado no servidor.
- O fluxo de pedido usa chave de idempotência, reserva transacional e recuperação de corrida; isso reduz duplicação de pedidos e overselling.
- O webhook valida HMAC com comparação em tempo constante, referência externa, valor, moeda e correspondência com a transação local antes de aplicar o evento.
- A criação de refund usa lock transacional, chave idempotente e bloqueio de valor acima do pagamento, apesar da lacuna do limite 100.
- Procedimentos de lojista, courier e cliente filtram ownership por usuário/loja/pedido em vários caminhos críticos.
- O repositório tem testes unitários, de integração, smoke financeiro, schema, CORS, storage, rate limit, inventário, outbox, dispatch e jornada vertical; os workflows também incluem build Expo e validação operacional MySQL/API.
- O código mantém secrets fora de `EXPO_PUBLIC_*` e o ambiente WebDev separado do clone Git, conforme a arquitetura desejada.

## Perguntas e decisões necessárias

1. Qual PSP será homologado primeiro e qual é o contrato oficial de estados para refund, chargeback e disputa?
2. O ambiente WebDev de produção usará Autoscale com jobs externos ou Reserved Hosting para garantir os workers? Quem será responsável pelo alerta de backlog?
3. Qual é a allowlist final de URLs web e deep links nativos para cada ambiente (preview, staging e produção)?
4. Qual política de retenção, backup, restore e LGPD será aceita antes de abrir o app ao público?
5. O lançamento inicial terá somente PIX/dinheiro/fiado, ou haverá outro método de pagamento? O contrato atual do checkout deve permanecer explicitamente restrito até a homologação.

## Cobertura e limites da auditoria

### Evidências automatizadas registradas

- Na execução final desta auditoria: `pnpm check`, `pnpm test` (**61 arquivos / 286 testes aprovados**), `pnpm build`, `pnpm lint` e `git diff --check` passaram.
- `pnpm go-live:check` respondeu **5 PASS, 0 BLOCKED e 8 NOT_CONFIGURED** no ambiente atual. O resultado não é um sinal verde comercial: PIX/webhook, e-mail, push real, backup/restore, E2E em dispositivos e observabilidade externa continuam não configurados.
- Suítes e smokes de pedido, Mercado, inventário, courier, delivery, tracking, avaliações, pagamentos, refund, reconciliação, CORS, storage, rate limit, outbox, onboarding e jornadas verticais presentes no repositório.
- CI inclui MySQL, migrações, verificação de tabelas/colunas, backup/restore smoke, API health/readiness, E2E de cliente/lojista/entrega, stress local e bundle Expo.
- WebDev persistente `/home/ubuntu/pediu-app` sincronizado, reiniciado, com preview navegável e checkpoints anteriores registrados.

### Não comprovado nesta auditoria

- Login Google em APK instalado com URL HTTPS estável e deep link homologado.
- Cobrança PIX, webhook, refund, chargeback e reconciliação no Mercado Pago real.
- CNPJ, contrato PSP, domínio/TLS de produção, alertas, backup contínuo e restore operacional.
- Push real em Android/iOS físicos, EAS build assinado e publicação no Google Play/App Store.
- SLA de workers em Autoscale ou Reserved sob tráfego real.

## Plano de correção recomendado

1. Fechar a máquina financeira real: refund confirmado, chargeback/disputa, reversão de ledger/comissão/payout e eventos idempotentes.
2. Endurecer OAuth: nonce/state correlacionado, allowlist de redirect, replay tests e revogação de sessão.
3. Definir topologia dos workers; se Reserved for escolhido, comunicar que é uma opção de uso medido com teto de aproximadamente US$ 37,50/mês em utilização integral de 1 vCPU/0,5 GB, antes de egress e após o crédito mensal aplicável.
4. Paginar reconciliação e substituir o `.limit(100)` de refunds por soma transacional no banco.
5. Unificar os gates de prontidão e adicionar métricas/alertas para backlog, atraso de outbox, webhook, refund e reconciliação.
6. Resolver N+1 de assets, reduzir write amplification de sessão e validar tokens/ownership de vendas.
7. Reexecutar matriz completa, stress, smoke WebDev e deployment smoke com URL HTTPS de staging; somente então atualizar o status de Go Live.

## Veredito

**Request Changes — o PR #9 não deve ser declarado pronto para público enquanto os bloqueadores P0/P1 acima e as dependências externas não tiverem evidência real.** A base de produto pode continuar evoluindo no WebDev e no PR, mas qualquer comunicação externa deve dizer “pronto para homologação técnica”, não “pronto para operação comercial”.
