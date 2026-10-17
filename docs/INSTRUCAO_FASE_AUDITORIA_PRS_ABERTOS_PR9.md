# Instrução Técnica — Auditoria de PRs abertos e paridade com o Pediu atual

## Objetivo

Comparar todos os PRs ainda abertos em `leonardoaranhaa/pediu-mobile` com o estado atual de `cursor/phase1-hybrid-ux-a9df` (PR #9), identificar entregas de UX ou domínio que ficaram de fora — especialmente telas de boas-vindas/onboarding — e separar contribuições aproveitáveis de branches obsoletas, duplicadas ou conflitantes.

## Regras de segurança

- O branch de trabalho permanece `cursor/phase1-hybrid-ux-a9df`.
- Nenhum PR será mergeado, fechado ou publicado nesta etapa sem revisão de diff e autorização correspondente.
- O código atual do PR #9 e o WebDev persistente continuam sendo as referências operacionais.
- Não copiar secrets, artefatos gerados, `node_modules`, banco local ou arquivos de ambiente de branches antigas.
- Toda incorporação futura deve passar por worktree isolado, testes, build, lint, smoke WebDev e checkpoint.

## Método

1. Listar PRs abertos, status, base, autor, checks e tipo (draft/pronto).
2. Buscar cada branch remoto e comparar sua árvore e commits com o PR #9 atual.
3. Classificar mudanças em: já incorporadas, ausentes e desejáveis, obsoletas/perigosas ou conflitantes.
4. Auditar rotas, componentes, copy, navegação, persistência e contratos server-side; não concluir apenas por título do PR.
5. Testar candidate changes em worktree isolado antes de qualquer incorporação.
6. Registrar a matriz final e o plano de integração no próprio documento e no `todo.md`.

## Critérios específicos para telas de boas-vindas

- A tela deve estar roteada e acessível pelo Expo Router.
- O primeiro acesso deve ser persistido sem bloquear login, deep link OAuth ou navegação direta.
- O conteúdo deve funcionar em web, Android e iOS, respeitar movimento reduzido e não gerar overflow.
- A experiência de boas-vindas não pode introduzir mock de conta, bypass de autenticação ou perda de carrinho/pedido.
- O onboarding deve ser distinto da home: apresentação inicial, progressão, skip/retorno e estado `hasSeen` devem ser claros.

## Saída esperada

Uma matriz com cada PR aberto, reaproveitamento recomendado, arquivos/funcionalidades ausentes, riscos, testes exigidos e decisão: incorporar no PR #9, manter separado, fechar como obsoleto ou aguardar decisão do produto.

## Resultado da auditoria — 2026-10-14

### PR #11 — `feat/onboarding-4-screens-swipe`

- **Situação:** os commits de onboarding já são ancestrais do PR #9; não existe código novo para re-mergear.
- **Entregas presentes:** `app/onboarding.tsx`, conteúdo em `lib/onboarding-content.ts`, teste de conteúdo, mascote contextualizado, swipe, indicadores, fallback de largura e movimento reduzido. O briefing `docs/PLAY_STORE_AND_ADS_PROMPTS.md` também já está presente.
- **Lacuna encontrada:** o `AsyncStorage` só é gravado ao finalizar/pular o onboarding. O `app/_layout.tsx` não lê `pediu:onboarding-complete`, não registra um gate de primeiro acesso e não redireciona para `/onboarding`. Portanto, a tela existe e responde por rota direta, mas não aparece automaticamente para um usuário novo.
- **Decisão:** não re-mergear PR #11. Corrigir o gate no PR #9 e depois manter o PR #11 como duplicado histórico, sem fechar automaticamente.

### PR #10 — `cursor/unifica-o-de-reposit-rios-delivery-415e`

- **Situação:** draft, apenas documentação de unificação e `docker-compose.yml` para MySQL local.
- **O que já está coberto:** o mapa de responsabilidades é compatível com a arquitetura atual; o WebDev persistente já substitui a necessidade de tratar o Docker local como runtime de preview.
- **Risco:** incorporar o compose como se fosse a arquitetura final criaria uma segunda operação paralela e contrariaria a separação clone Git → workspace WebDev.
- **Decisão:** manter como referência documental; não incorporar código ao PR #9 nesta fase.

### PR #8 — `cursor/dev-env-seed-login-306f`

- **Situação:** draft, mergeable, porém o check `mysql-and-api-smoke` falha no smoke de notification outbox (`attemptCount`/`lastError` não atingem o valor esperado). O CI está verde apenas no job de validação estática.
- **Entregas relevantes, mas não equivalentes ao onboarding:** contas seed/dev, login bypass para desenvolvimento, preparação de release, legal routes, exclusão definitiva de conta e Sign in with Apple.
- **Riscos:** `DEV_AUTH_ENABLED` não pode entrar em produção; a exclusão definitiva altera a semântica atual de exclusão assistida e exige revisão de retenção/LGPD; Apple exige entitlement e configuração externa independente do Google.
- **Decisão:** não incorporar o PR inteiro. Avaliar em fases separadas apenas legal/exclusão, release e seeds de QA, sempre com testes de regressão e sem bypass no APK de produção.

### PR #4 — `feat/core-marketplace-flow`

- **Situação:** cliente Flutter separado, mergeable `CONFLICTING`/antigo em relação ao Expo atual.
- **Entregas:** outro cliente nativo com sua própria navegação, storage e integração tRPC.
- **Decisão:** manter fora do PR #9 e do fluxo Expo/WebDev; preservar como frente Flutter separada conforme decisão anterior do produto.

### Conclusão executiva

O item de boas-vindas não está ausente como tela; está incompleto como **fluxo de primeiro acesso**. A correção segura é adicionar um guard persistente no layout raiz, isentando `/onboarding` e `/oauth/callback`, sem mexer em autenticação, carrinho, pedidos ou backend. Depois disso, a matriz de implementação deve deixar de classificar onboarding como `FALTA` e passar a `OK` após os testes multiplataforma.

Há também um bloqueio operacional independente da auditoria: a tentativa recente de runtime/deploy WebDev reportou ausência de `ALLOWED_ORIGINS` e `OBSERVABILITY_TOKEN` na configuração de produção. Isso não deve ser resolvido com valores no código; deve ser provisionado pelo mecanismo seguro de secrets antes de qualquer deploy produtivo.
