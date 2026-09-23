# Auditoria completa do aplicativo de delivery — Pediu Mobile

## Resumo executivo

A auditoria foi realizada sobre o branch `feat/core-marketplace-flow`, no commit `1b215fb4ac4e1a19f70e932265d77889e796d996`, associado ao [pull request #3](https://github.com/leonardoaranhaa/pediu-mobile/pull/3). O aplicativo possui uma base funcional relevante: o fluxo de catálogo, carrinho, cotação server-side, pedidos idempotentes, fiado, endereço, tracking, chat, suporte, conta e temas está representado no código; as validações locais de TypeScript, testes, build, lint e migrations foram executadas com sucesso.

Apesar disso, a revisão encontrou **bloqueios para produção**. Os principais são: CORS refletindo qualquer origem junto com cookies credenciais e ausência de proteção CSRF; exposição de código OAuth e informações de sessão em logs; endpoint público que dispara chamada de LLM sem rate limiting; fluxo de pagamento com cartão que apenas cria um pagamento pendente, sem gateway/webhook de confirmação; ausência de persistência da localização capturada; e inconsistência entre criação de loja e promoção do usuário para o papel de lojista. O veredito é **Request Changes / não aprovar para produção neste estado**.

## Veredito

**[ ] Aprovar** · **[x] Solicitar alterações** · **[ ] Apenas comentar**

A recomendação é corrigir primeiro os itens críticos e altos, repetir o E2E com banco e provedor de pagamento controlados, e somente então iniciar uma preparação de release.

## Escopo e método

A revisão cobriu cliente Expo/React Native, layout e providers, autenticação OAuth e sessão, routers tRPC, autorização por papel, camada Drizzle/MySQL, migrations, checkout, pagamentos, fiado, pedidos, entregas, tracking, chat, notificações, suporte, privacidade, armazenamento, observabilidade, testes e workflows.

Foram realizados rastreamento estático de chamadas, leitura dos contratos backend até as telas consumidoras, inspeção de constraints e migrations, auditoria de dependências e execução dos validadores do projeto. Os achados abaixo distinguem problemas confirmados por código, riscos que exigem configuração de produção para exploração e lacunas de produto.

## Resultado dos validadores

| Verificação | Resultado |
|---|---:|
| `pnpm check` | Passou |
| `pnpm test` | 21 arquivos passaram; 85 testes passaram; 1 teste foi pulado |
| `pnpm build` | Passou; bundle do servidor de aproximadamente 133,9 KB |
| `pnpm lint` | Passou |
| `git diff --check` | Passou |
| Migrations em banco MariaDB vazio | Passou; 22 migrations e 32 tabelas criadas |
| `pnpm audit --prod` | Falhou; relatório do registry informou 2 críticas, 92 altas, 51 moderadas e 7 baixas |
| E2E automatizado versionado | Ausente; há testes Vitest e evidências manuais documentadas, mas não há Playwright, Detox ou Appium no projeto |

O resultado verde dos validadores demonstra consistência de compilação e de contratos unitários, mas não comprova segurança de produção, funcionamento de gateway, concorrência real ou compatibilidade com dispositivo físico.

## Achados críticos e altos

### F-001 — CORS permissivo com credenciais deixa mutations autenticadas expostas a CSRF

**Severidade: crítica/alta — segurança**  
**Referências:** `server/_core/index.ts:34-53`; `server/_core/cookies.ts:47-60`.

O servidor copia qualquer valor recebido no header `Origin` para `Access-Control-Allow-Origin` e habilita `Access-Control-Allow-Credentials: true`. Ao mesmo tempo, a sessão é criada com `SameSite: "none"` em requisições HTTPS. Não há allowlist de origens, token CSRF, verificação de `Origin`/`Referer` para mutations ou outra barreira equivalente.

Em um navegador que aceite o cookie cross-site, um site malicioso pode fazer requisições credenciadas para ações como criar pedido, cancelar pedido, alterar perfil, alterar endereço, registrar preferência, gerar cobrança PIX ou enviar mensagens. Como a origem também é refletida, a página atacante pode potencialmente ler as respostas.

**Correção recomendada:** substituir a reflexão arbitrária por allowlist explícita de origens de produção e preview; emitir `Vary: Origin`; usar `SameSite=Lax` quando a arquitetura permitir; adicionar proteção CSRF com token por sessão ou double-submit cookie; e rejeitar mutations quando `Origin`/`Referer` não estiverem na política permitida. Adicionar testes HTTP que simulem uma origem não autorizada.

### F-002 — Código OAuth, state e informações de sessão são registrados nos logs do cliente

**Severidade: alta — segurança e privacidade**  
**Referências:** `app/oauth/callback.tsx:24-31`, `app/oauth/callback.tsx:75-82`, `app/oauth/callback.tsx:121-125`, `app/oauth/callback.tsx:178-182`; `lib/_core/api.ts:35-61`, `lib/_core/api.ts:86-96`.

O callback imprime os parâmetros recebidos incluindo o `code` e o `state` completos. Também constrói e registra a URL com os parâmetros OAuth. O cliente API registra a URL completa, headers de resposta, `Set-Cookie` e fragmentos do session token. Em ambientes de desenvolvimento, logs do Metro, console remoto, agregadores ou gravações de sessão podem ficar acessíveis a terceiros.

Um authorization code pode ser trocado antes de expirar; um session token parcial ainda é material sensível e os headers podem conter credenciais de sessão. O problema não depende de o usuário visualizar o log: basta que o ambiente o colete.

**Correção recomendada:** remover logs de `code`, `state`, URLs com query OAuth, `Set-Cookie`, headers completos e qualquer fragmento de token; substituir por identificadores de correlação e flags booleanas como `hasCode`/`hasSession`; aplicar sanitização centralizada e um teste que falhe quando valores sensíveis aparecem no logger.

### F-003 — Session token pode ser transportado e aceito diretamente na URL de callback

**Severidade: alta — segurança**  
**Referências:** `app/oauth/callback.tsx:12-18`, `app/oauth/callback.tsx:33-36`, `app/oauth/callback.tsx:152-155`.

A rota de callback aceita `sessionToken` como parâmetro de URL e o grava diretamente no armazenamento seguro. Tokens em URL podem aparecer em histórico, logs de proxy, analytics, screenshots, deep-link handlers ou mecanismos de diagnóstico. O fluxo web já possui um caminho melhor: o servidor define um cookie HttpOnly e redireciona.

**Correção recomendada:** remover o transporte de token de sessão em query/deep link; usar apenas authorization code de uso único com PKCE ou um código de troca curto e descartável; invalidar o código após o primeiro uso; e limpar a URL imediatamente após o callback.

### F-004 — Endpoint público de interpretação de voz dispara LLM sem autenticação ou rate limiting

**Severidade: alta — abuso de custo e disponibilidade**  
**Referências:** `server/routers.ts:185-187`; `server/voice.ts:11-47`.

`pediu.voice.interpret` é `publicProcedure` e chama `invokeLLM` com o modelo `gpt-5-mini` para cada requisição. O input tem limite de tamanho, mas não há autenticação, quota por IP/usuário, rate limit, timeout da operação ou cache. Qualquer cliente externo pode automatizar chamadas e gerar consumo financeiro ou saturação do serviço.

A transcrição é protegida, porém também aceita até 22 milhões de caracteres de base64 e encaminha o conteúdo para storage e serviço de Speech-to-Text sem validação forte de MIME/magic bytes ou quota por usuário.

**Correção recomendada:** proteger interpretação e transcrição ou aplicar rate limiting distribuído por IP e usuário; definir quotas e circuit breaker; limitar concorrência; validar MIME permitido, tamanho binário após decodificação e duração do áudio; e registrar métricas de custo sem registrar o conteúdo da fala.

### F-005 — Cartão é apresentado como método de pagamento, mas não existe cobrança real nem confirmação por webhook

**Severidade: alta — integridade financeira e produto**  
**Referências:** `app/checkout.tsx:9`, `app/checkout.tsx:112-120`; `server/routers.ts:121-150`; `server/payments.ts:18-43`.

O checkout permite selecionar `card` e informa que o cartão será processado pelo provedor. No backend, entretanto, `orders.create` apenas cria um pedido e um registro `pediu_payments` com status `pending`. O único gateway implementado é uma fronteira de PIX; o modo `manual` retorna cobrança pendente e não existe endpoint de webhook que atualize `payments` para `paid`, `failed` ou `refunded`.

O resultado é uma divergência perigosa: o usuário pode confirmar um pedido com cartão sem que cartão algum tenha sido autorizado, e a interface pode apresentar um pedido criado como se o fluxo financeiro estivesse completo. O mesmo vale para PIX quando `PIX_PROVIDER=manual`: a cobrança permanece pendente sem confirmação automática.

**Correção recomendada:** remover cartão do checkout até existir integração de gateway; ou implementar criação de intent/payment, confirmação server-side, webhook autenticado e idempotente, reconciliação de status, cancelamento e refund. Para PIX manual, exibir claramente “aguardando confirmação manual” e impedir qualquer transição financeira baseada apenas na criação do pedido.

### F-006 — Criação de loja não altera o papel do usuário e pode deixar o lojista sem acesso ao próprio painel

**Severidade: alta — autorização e fluxo de negócio**  
**Referências:** `server/routers.ts:107-110`; `app/(tabs)/index.tsx:520-526`; `app/seller/index.tsx:10-14`.

`pediu.stores.create` cria a loja com `ownerId`, mas não promove ou solicita aprovação para `users.role = "merchant"`. A criação é disparada pela home para qualquer usuário autenticado. Em seguida, as telas do lojista habilitam queries quando `user?.role === "merchant"`. Portanto, uma conta comum pode criar a loja e, ainda assim, o painel, pedidos e loja permanecerem desabilitados porque a sessão continua com papel `user`.

O problema também afeta a mensagem da interface que informa que o modo vendedor aparece quando a conta possui perfil de estabelecimento, enquanto a implementação real exige um papel separado.

**Correção recomendada:** definir um fluxo explícito de onboarding: `stores.create` deve executar transação de criação da loja e alteração/aprovação do papel, ou retornar estado `pending` até aprovação administrativa. A autorização de backend deve ser a fonte de verdade e a UI deve consultar `stores.mine`/permissão efetiva em vez de depender apenas do papel cacheado.

### F-007 — A localização capturada automaticamente não é persistida nem vinculada ao checkout

**Severidade: alta — confiabilidade do delivery**  
**Referências:** `app/location.tsx:9-53`.

A tela captura GPS, geocodifica e mantém endereço e coordenadas apenas em `useState`. O botão “Continuar” apenas navega para a home; não cria/atualiza `customerAddresses`, não grava preferência de endereço e não injeta o resultado no carrinho ou checkout. Se o usuário navegar, recarregar ou abrir o checkout em outra tela, a localização capturada é perdida.

Isso contradiz a promessa de que o endereço será usado para facilitar pedidos e calcular opções de entrega. A tela de checkout consulta endereços persistidos, mas não consome o estado dessa tela.

**Correção recomendada:** após confirmação do usuário, persistir o endereço via `pediu.addresses.create` com latitude/longitude, pedir label e número quando a geocodificação não for suficiente, definir o endereço padrão quando apropriado e selecionar esse registro no checkout. Cobrir permissão negada, GPS indisponível, endereço incompleto e edição manual.

### F-008 — A atualização de entrega não é atômica e pode duplicar transições, eventos e notificações

**Severidade: alta — consistência operacional**  
**Referências:** `server/experience-router.ts:65-84`; `server/db.ts:628-653`, `server/db.ts:655-659`.

A mutation de posição consulta o pedido e a atribuição, insere a localização, depois atualiza o pedido para `A caminho`, cria evento e envia push. A mutation de conclusão consulta o status, atualiza pedido, atualiza atribuição, cria evento e envia push em chamadas separadas. A idempotência da posição evita duplicar a mesma chave, mas não protege duas requisições diferentes concorrentes.

Duas requisições simultâneas podem observar `Pronto`, gerar mais de um evento de saída e mais de uma notificação. Duas conclusões podem passar pela mesma pré-condição e produzir eventos/push duplicados. Falhas entre as chamadas também deixam pedido, atribuição e timeline divergentes.

**Correção recomendada:** mover a transição, evento e atualização da atribuição para uma transação com bloqueio/condição no `UPDATE`, por exemplo `WHERE status = 'Pronto'` ou `WHERE status = 'A caminho'`; usar outbox transacional para notificações; e tornar `complete` idempotente retornando o resultado existente quando o pedido já estiver entregue.

### F-009 — O caminho de criação de chamado de suporte bypassa o extrator robusto de `insertId`

**Severidade: alta — defeito funcional confirmado por padrão de implementação**  
**Referências:** `server/experience-router.ts:93-99`; `server/db.ts:8-15`, `server/db.ts:84-89`.

A camada `server/db.ts` criou `getInsertId`, que valida o formato retornado pelo Drizzle/MySQL e evita IDs inválidos. O procedimento `pediu.experience.support.create`, porém, executa `db.insert` diretamente e calcula o resultado com `Number((...).insertId)`. Esse é exatamente o padrão que a camada de dados foi criada para eliminar; dependendo do retorno do driver, o valor pode ser `NaN` ou `0`, embora o chamado tenha sido persistido.

O impacto aparece no fluxo de suporte: a interface pode informar um número inválido e não conseguir abrir a conversa correspondente. O caminho `privacy.requestDeletion` usa a função centralizada e não sofre desta falha específica.

**Correção recomendada:** criar `db.createSupportTicket` para todos os caminhos, como já existe em `server/db.ts:84-89`, e adicionar teste de integração usando MariaDB real que verifique `ticketId > 0` e consulta imediata do chamado.

## Achados médios e riscos arquiteturais

### F-010 — Ausência de chaves estrangeiras deixa pedidos, pagamentos, entregas e mensagens órfãos

**Severidade: média/alta — integridade de dados**  
**Referências:** `drizzle/schema.ts:15-425`; migrations `drizzle/*.sql`.

A auditoria não encontrou `references(...)`, `FOREIGN KEY` ou `REFERENCES` no schema/migrations. Campos como `orders.customerId`, `orders.storeId`, `payments.orderId`, `orderItems.orderId`, `deliveryEvents.orderId`, `deliveryAssignments.orderId`, `chatMessages.orderId`, `supportTicketMessages.ticketId` e `notifications.userId` são apenas inteiros.

A aplicação faz verificações de autorização, mas exclusões, correções manuais, jobs e falhas parciais podem produzir registros órfãos. Em um delivery, essa ausência afeta reconciliação financeira, LGPD, suporte e auditoria.

**Correção recomendada:** introduzir FKs em migrations compatíveis com os dados existentes, definir política de `RESTRICT`/`CASCADE` conscientemente, criar um relatório de órfãos antes da migration e adicionar testes de integridade.

### F-011 — Listagens de alto crescimento não têm limite ou paginação em vários contratos protegidos

**Severidade: média — performance e disponibilidade**  
**Referências:** `server/db.ts:479-483`, `server/db.ts:576-580`, `server/db.ts:661-665`, `server/db.ts:829-833`; `server/experience-router.ts:89-91`, `server/routers.ts:118-120`, `server/routers.ts:189-192`.

Pedidos da loja e do cliente, mensagens de chat, notificações e mensagens de suporte são retornados sem limite. O catálogo possui paginação, mas os principais recursos pós-compra não. O crescimento de um lojista, usuário ou pedido pode aumentar o payload e o tempo de consulta indefinidamente.

**Correção recomendada:** adotar `limit` máximo obrigatório, cursor por `createdAt/id`, ordenação determinística, índices correspondentes e carregamento incremental no cliente. O histórico completo deve ser exportação/paginação, não resposta padrão de tela.

### F-012 — Proxy de storage assina qualquer caminho sem autenticação ou autorização de objeto

**Severidade: média/alta — privacidade de arquivos**  
**Referências:** `server/_core/storageProxy.ts:4-46`; `server/storage.ts:74-97`.

`GET /manus-storage/*` recebe um caminho arbitrário, solicita uma URL assinada ao Forge e redireciona o cliente. Não há sessão, ownership, prefixo permitido ou verificação de autorização. Se uma chave de arquivo privado for descoberta ou previsível, o proxy pode entregar o objeto a qualquer cliente.

O risco é agravado porque a geração de imagem usa prefixos previsíveis (`generated/<timestamp>.png`) e o áudio usa prefixo com ID do usuário e timestamp, embora receba sufixo aleatório.

**Correção recomendada:** não expor proxy genérico público; guardar metadados de ownership; gerar URLs assinadas apenas após autorização; validar prefixos e normalizar traversal; usar endpoint de download protegido ou URLs de curta duração sem redirecionamento público.

### F-013 — A validação de sessão não confere o `appId` contra o ambiente atual

**Severidade: média — isolamento entre aplicações**  
**Referências:** `server/_core/sdk.ts:181-205`, `server/_core/sdk.ts:234-290`; `server/_core/env.ts:1-12`.

O JWT contém `appId`, mas `verifySession` apenas verifica assinatura, expiração e presença de `openId`, `appId` e `name`. A implementação não compara `appId` com `ENV.appId`; depois, `authenticateRequest` usa a sessão para autenticar o usuário sem essa validação.

Se o mesmo segredo for reutilizado entre ambientes/aplicações ou se um token assinado por outro contexto chegar ao servidor, a fronteira lógica entre projetos fica enfraquecida.

**Correção recomendada:** exigir `appId === ENV.appId` na verificação, validar issuer/audience quando aplicável, falhar no startup se `JWT_SECRET`/`VITE_APP_ID` estiverem ausentes em produção e usar segredos distintos por ambiente.

### F-014 — Preferência de tema é persistida por dispositivo, não por usuário

**Severidade: média — expectativa de produto e sincronização**  
**Referências:** `lib/app-preferences.tsx:74-101`; `components/theme-picker.tsx:18-24`.

Os três temas funcionam e são compartilhados entre cliente e lojista no mesmo dispositivo, mas a chave é fixa (`pediu:app-theme`). A própria interface declara que a escolha fica salva “neste dispositivo”. Portanto, a personalização não acompanha o login em outro aparelho, não é restaurada por conta e pode misturar preferências quando usuários diferentes usam o mesmo dispositivo.

**Correção recomendada:** se a intenção for personalização por conta, persistir `themeId` em preferências do usuário no backend, com cache local por `userId`; no logout, limpar ou separar o estado; manter fallback local para visitante.

### F-015 — Atualização de e-mail não exige verificação

**Severidade: média — segurança da conta e comunicação**  
**Referências:** `server/routers.ts:50-58`; `server/db.ts:37-43`; `app/account/personal.tsx`.

O usuário autenticado pode alterar o e-mail diretamente. Esse e-mail aparece como identidade da conta e pode ser usado por comunicação futura, mas não há fluxo de confirmação do novo endereço. A autenticação principal usa `openId`, portanto o impacto imediato não é takeover, mas a conta pode ficar associada a endereço de terceiro ou perder notificações importantes.

**Correção recomendada:** tratar mudança de e-mail como solicitação pendente, enviar link de confirmação para o novo endereço, manter o anterior até confirmação e registrar auditoria da alteração.

### F-016 — Alteração de status de chamado pode retornar sucesso para ticket inexistente

**Severidade: baixa/média — auditoria operacional**  
**Referências:** `server/admin-router.ts:19-21`; `server/db.ts:240-244`.

`supportStatus` atualiza pelo ID e cria o log de auditoria sem verificar se alguma linha foi alterada. Um admin pode receber sucesso e gerar auditoria para um chamado que não existe ou já foi removido.

**Correção recomendada:** retornar `affectedRows`, rejeitar quando for zero e só criar o audit log depois da confirmação da alteração.

## Pagamentos e pós-venda: conformidade funcional

A máquina de estados de pedido é um ponto positivo: `server/order-state.ts:5-21` restringe transições e o cliente só pode cancelar antes do preparo. Ainda assim, o fluxo financeiro não fecha o ciclo de delivery real:

1. O pagamento é criado como `pending` no checkout.
2. PIX possui um boundary de gateway em `server/payments.ts`, mas o modo `manual` não confirma pagamento.
3. Cartão aparece na UI, porém não há charge/intent/card tokenization.
4. Não há rota de webhook no servidor para validar assinatura, deduplicar evento e atualizar pagamento.
5. Não há reconciliação entre pagamento confirmado e autorização de preparo/entrega.
6. Não há fluxo de refund implementado, apesar de existirem tabelas de refunds e status financeiros no schema.

Antes de operar com dinheiro real, deve existir uma matriz explícita de estados de pedido e pagamento, incluindo cancelamento, falha, timeout, pagamento duplicado, chargeback, refund e divergência entre gateway e banco.

## Testes e lacunas de cobertura

A suíte Vitest cobre bem contratos unitários e vários cenários de autorização. Os pontos positivos incluem testes de idempotência de checkout, reviews, chat, entrega, fiado, notificações e pagamento. Também foi validado o caminho de migrations em banco MariaDB vazio.

Persistem lacunas importantes:

- Não existe E2E automatizado versionado com Playwright, Detox, Appium ou equivalente.
- Não há teste HTTP real para CORS, cookies, CSRF e preflight.
- Não há teste de OAuth com callback malicioso, replay de code, state inválido ou token em URL.
- Não há teste de concorrência real para duas criações de pedido, duas atualizações de entrega, dois `complete` ou dois lançamentos de fiado.
- Não há teste de gateway/webhook PIX ou cartão.
- Não há teste de persistência da localização capturada no checkout.
- Não há teste de criação de loja seguida de sessão/painel de lojista.
- Não há teste de ownership do storage proxy.
- Um teste de logout está pulado, segundo a saída do Vitest.

## Pontos positivos

A revisão encontrou boas decisões que devem ser preservadas:

- O total do checkout é recalculado a partir de produtos e loja no servidor, em vez de confiar no preço enviado pelo cliente (`server/routers.ts:64-105` e `server/routers.ts:121-150`).
- Existe chave de idempotência para pedido, localização, chat, mensagens de suporte e avaliações.
- O fiado usa transação e atualiza saldo, ledger, pedido e pagamento no mesmo bloco (`server/db.ts:542-573`).
- As queries de catálogo possuem limite máximo e paginação (`server/db.ts:384-419`).
- Os procedures protegidos e administrativos estão separados em `protectedProcedure` e `adminProcedure` (`server/_core/trpc.ts:37-69`).
- A observabilidade registra procedimento, duração e resultado sem incluir payload do usuário (`server/_core/observability.ts:3-24`).
- A suíte automatizada possui 85 testes aprovados e a cadeia de build/lint está verde.
- A máquina de estados impede transições arbitrárias de pedido.

## Plano de correção priorizado

### P0 — antes de qualquer exposição pública

1. Corrigir CORS e implementar CSRF/validação de origem.
2. Remover logs de OAuth, cookies, headers, codes, state e tokens.
3. Remover token de sessão de URLs e adotar fluxo de code/PKCE ou código descartável.
4. Colocar rate limit, quota e circuit breaker no interpretador de voz e transcrição.
5. Remover cartão do checkout até existir gateway real ou concluir a integração com webhook e reconciliação.

### P1 — antes de operação comercial

1. Corrigir promoção/onboarding de lojista e cobrir criação de loja até acesso ao painel.
2. Persistir localização confirmada em `customerAddresses` e conectá-la ao checkout.
3. Tornar transições de entrega atômicas e idempotentes, incluindo outbox de notificações.
4. Corrigir `support.create` para usar `db.createSupportTicket`/`getInsertId`.
5. Validar `appId` no JWT e exigir segredos/configuração obrigatórios em produção.
6. Proteger storage por ownership e URLs assinadas de curta duração.

### P2 — robustez, escala e conformidade

1. Adicionar FKs e limpeza/relatório de órfãos.
2. Paginar pedidos, notificações, chat e suporte com cursor.
3. Implementar verificação de novo e-mail e auditoria de mudanças de conta.
4. Decidir se temas são por dispositivo ou por conta; implementar a escolha de forma consistente.
5. Adicionar E2E automatizado, testes de concorrência, testes de segurança HTTP e webhook tests.
6. Triar o relatório de dependências e atualizar o lockfile de forma controlada, distinguindo vulnerabilidades do bundle runtime das dependências da CLI Expo.

## Perguntas abertas para produto e operação

1. O lojista é aprovado automaticamente no cadastro ou a loja precisa de aprovação administrativa?
2. O entregador é uma pessoa/usuário distinto do proprietário da loja ou o proprietário é apenas um operador temporário do MVP?
3. O pedido pode entrar em preparo antes de pagamento confirmado para PIX/cartão?
4. O modo manual de PIX será aceito em produção ou é somente cenário de demonstração?
5. A localização deve ser uma preferência por conta, um endereço persistido ou apenas uma cotação de sessão?
6. Quais origens web serão permitidas em produção, preview e ambientes administrativos?
7. Quais são os requisitos de retenção e anonimização de pedidos, ledger, notificações, áudio e suporte para LGPD?

## Limitações da evidência

A auditoria foi estática e local, complementada por execução de suíte, build, lint e migrations em MariaDB vazio. Não foram usadas credenciais reais de OAuth, gateway de pagamento ou push em produção; portanto, não é possível afirmar que um provedor externo esteja corretamente configurado. O preview web anterior foi usado para smoke tests manuais, mas a ausência de E2E automatizado versionado continua sendo uma lacuna. O resultado de `pnpm audit --prod` deve ser triado por cadeia de dependências: o relatório inclui vulnerabilidades transitivas sob Expo CLI, e sua presença no grafo não prova que todas estejam no bundle runtime do servidor ou do aplicativo.

## Conclusão

O Pediu já possui uma fundação técnica acima de um mock visual, com contratos de domínio, persistência, autorização básica, idempotência e cobertura unitária. Contudo, os riscos de CORS/CSRF, vazamento de credenciais OAuth, endpoint LLM sem controle, pagamento não confirmado, localização não persistida e inconsistência de papel do lojista afetam diretamente segurança, dinheiro e a jornada central do delivery. O app deve permanecer em ambiente de desenvolvimento/QA até que os itens P0 e P1 sejam corrigidos e validados por E2E e testes de concorrência.

**Recomendação final: Request Changes.**

## Referências de execução

- Branch auditado: `feat/core-marketplace-flow`
- Commit auditado: `1b215fb4ac4e1a19f70e932265d77889e796d996`
- Pull request: [#3 — feat: establish core customer flow architecture](https://github.com/leonardoaranhaa/pediu-mobile/pull/3)
- Documento de instrução: `docs/INSTRUCAO_AUDITORIA_COMPLETA_DELIVERY_2026-09-22.md`
- Migrations testadas: `drizzle/0000` até `drizzle/0021`, total de 22 migrations
- Banco de auditoria: `pediu_audit`, criado isoladamente para a validação e não usado pelo aplicativo de produção

> Este relatório registra achados da auditoria; ele não aplica correções no código nem altera configurações externas.


---

## Addendum de resolução — 2026-09-23

Este addendum substitui o veredito operacional do snapshot acima para o código atualmente preparado no branch `feat/core-marketplace-flow`. Os achados foram tratados no código, nas migrations, nos testes e na documentação. A resolução não equivale a uma autorização de produção: os limites dependentes de infraestrutura externa e os testes E2E ainda estão explicitados abaixo.

### Matriz de resolução

| Achado | Status atual | Evidência principal | Limitação ou ação externa restante |
|---|---|---|---|
| F-001 CORS/CSRF | **Resolvido no código** | `server/_core/security.ts`, allowlist/preflight em `server/_core/index.ts`, cookies `HttpOnly`/`SameSite=Lax`, bloqueio de mutations baseadas em cookie e `tests/security.test.ts` | Rate limit e allowlist são process-local; em escala horizontal usar Redis/API gateway e configurar `ALLOWED_ORIGINS` por ambiente |
| F-002 logs OAuth sensíveis | **Resolvido** | Logs de callback, API, SDK e autenticação não registram code, state, token, cookie, URL ou headers sensíveis | Recomenda-se revisar também a política de retenção do observability provider |
| F-003 token em URL | **Resolvido** | `app/oauth/callback.tsx` aceita apenas `code`, `state` e `error`; sessão mobile retorna no corpo e é armazenada no SecureStore | O provedor OAuth ainda deve manter PKCE/state corretamente configurados |
| F-004 voz sem controles | **Resolvido no código** | Rate limit por IP/usuário, timeout, concorrência limitada, tamanho Base64/binário e validação de assinatura MIME em `server/routers.ts` | Limites são process-local; antes de escalar, migrar quota/circuit breaker para infraestrutura distribuída |
| F-005 cartão/pagamento sem confirmação | **Resolvido como decisão segura de produto** | Cartão removido do checkout e do fluxo legado; `server/payment-webhook.ts` valida HMAC SHA-256, payload e idempotência via `webhookEvents` | Configurar `PAYMENT_WEBHOOK_SECRET` e um provedor PIX real compatível; o boundary não substitui homologação do gateway, refund, chargeback e reconciliação |
| F-006 promoção de lojista | **Resolvido** | `db.createStore` cria loja e promove `users.role` para `merchant` na mesma transação; UI reidrata o perfil após onboarding | Se houver aprovação manual no futuro, substituir promoção automática por estado de aprovação explícito |
| F-007 localização não persistida | **Resolvido** | `app/location.tsx` captura/geocodifica, normaliza UF, cria endereço padrão com latitude/longitude via `pediu.addresses.create` | Geocodificação e permissões do dispositivo continuam dependentes de configuração/consentimento externo |
| F-008 entrega não atômica | **Resolvido no código** | Transações condicionais para `Pronto -> A caminho` e `A caminho -> Entregue`, eventos/atribuição no mesmo bloco e push apenas quando há mudança | Push ainda é pós-transação; para garantia de entrega usar outbox transacional/worker distribuído |
| F-009 suporte bypassa `insertId` | **Resolvido** | `experience.support.create` usa `db.createSupportTicket`, que centraliza `getInsertId` | Cobertura automatizada adicional com banco real continua recomendada |
| F-010 ausência de FKs | **Resolvido** | `drizzle/schema.ts`, `0022_user_theme_email_verification.sql` e `0023_core_foreign_keys.sql`; MariaDB limpo criou 34 tabelas e 49 FKs | Dados existentes devem passar por relatório de órfãos antes da aplicação em ambiente com dados |
| F-011 listagens sem teto | **Resolvido como mitigação de payload** | Contratos de pedidos, chat, notificações, suporte e eventos receberam `limit`/`offset`; listas operacionais também têm limites máximos defensivos | A UX ainda pode evoluir para carregamento incremental/cursor para históricos extensos |
| F-012 storage sem autorização | **Resolvido com escopo explícito** | `storageProxy.ts` exige autenticação, normaliza chave e permite somente `voice/<userId>/`, com cache privado | Assets `generated/*` permanecem bloqueados até existir metadado de ownership e política de publicação |
| F-013 sessão sem `appId` | **Resolvido** | `sdk.verifySession` compara o claim com `ENV.appId`; `ENV.assertRuntimeConfig()` exige configuração crítica em produção | Segredos devem ser distintos por ambiente e issuer/audience podem ser adicionados quando o provedor os oferecer |
| F-014 tema por dispositivo | **Resolvido** | Coluna `users.themePreference`, mutation protegida, cache por usuário/visitante e sincronizador global em `AppPreferencesProvider` acionado no login/logout | A preferência remota exige backend disponível; visitante continua local por desenho |
| F-015 e-mail sem confirmação | **Resolvido no código** | Token aleatório armazenado como hash, expiração de 30 minutos, endpoint `/api/auth/verify-email` e troca somente após confirmação | Configurar `EMAIL_WEBHOOK_URL` e `EMAIL_VERIFICATION_BASE_URL`; sem provedor a solicitação permanece pendente e o e-mail não é alterado |
| F-016 auditoria de ticket inexistente | **Resolvido** | Leitura prévia e rejeição de ticket ausente em `updateSupportTicketStatus`; audit log só ocorre após sucesso; teste de regressão incluído | Nenhuma limitação funcional conhecida; observabilidade de erros continua recomendada |

### Validação pós-correção

| Verificação | Resultado atual |
|---|---:|
| `pnpm check` | Passou |
| `pnpm test` | 22 arquivos passaram; 90 testes passaram; 1 teste foi pulado |
| `pnpm build` | Passou; `dist/index.js` com aproximadamente 154,9 KB |
| `pnpm lint` | Passou |
| `git diff --check` | Passou |
| Migrações em MariaDB vazio | Passou; migrations `0000`–`0023`, 34 tabelas, 49 FKs e 24 registros no journal |
| Testes focados de segurança/admin/entrega | Passou; 14 testes |
| E2E automatizado versionado | Ainda ausente; permanece como próxima melhoria de QA |

Os controles locais de segurança são adequados para o modelo atual de instância única, mas não devem ser considerados distribuídos. O webhook de pagamento é uma fronteira genérica assinada e idempotente, não uma integração homologada com um PSP. Da mesma forma, o envio de e-mail é deliberadamente configurável por webhook. Essas limitações estão documentadas para evitar que o código seja interpretado como gateway, provedor de e-mail ou outbox completos.

### Veredito atualizado

Para o código corrigido, o veredito passa de **Request Changes por bloqueios confirmados** para **correções implementadas, aguardando configuração externa e validação E2E antes de produção**. O PR ainda deve ser submetido ao CI após o commit, e qualquer falha de workflow deve ser corrigida antes do merge.

> Este addendum registra a resolução técnica no branch; não configura provedores externos, não altera segredos e não substitui homologação de pagamento, e-mail, OAuth, push ou testes em dispositivos reais.
