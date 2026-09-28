# Plano de Go-Live — Pediu

> Documento operacional para levar o Pediu do estado de desenvolvimento/QA para uma operação comercial real, controlada e observável.

**Status:** 🟡 Em preparação para Go-Live  
**Branch de origem do plano:** `main`  
**Última referência técnica:** auditoria de 22–23/09/2026  
**Objetivo:** transformar a base técnica já implementada em uma operação real, com pagamentos, comunicação, segurança, infraestrutura, QA e publicação devidamente homologados.

---

## 1. Objetivo do Go-Live

O Go-Live do Pediu não será tratado como um único deploy. Ele será considerado concluído somente quando o fluxo completo estiver validado:

**Cliente → catálogo → carrinho → checkout → pagamento → lojista → preparo → entregador → entrega → comunicação → pós-venda**

O código atual já possui uma base funcional importante. O foco desta etapa é fechar as dependências externas e operacionais que não podem ser validadas apenas por testes unitários.

### Critério geral

O Pediu só deve entrar em operação comercial aberta depois que:

- todos os bloqueadores P0 estiverem concluídos;
- o pagamento real estiver homologado;
- os fluxos críticos tiverem E2E automatizado e validação em dispositivos reais;
- backup e restauração do banco tiverem sido testados;
- observabilidade e alertas estiverem ativos;
- OAuth, e-mail, push, storage e domínios estiverem configurados;
- o primeiro piloto controlado tiver sido executado sem incidentes críticos.

---

# 2. Estado atual

## Já implementado e validado no código

- CORS e proteções de origem/cookie.
- Sanitização de logs OAuth.
- Remoção de sessão por URL.
- Controles de rate limit/timeout/concurrency no fluxo de voz.
- Cartão removido do checkout até existir gateway real.
- Boundary de webhook de pagamento com assinatura HMAC e idempotência.
- Promoção transacional de lojista.
- Persistência de localização.
- Transições de entrega atômicas/idempotentes.
- Centralização de `getInsertId`.
- Foreign keys.
- Limites defensivos em listagens.
- Storage com escopo por usuário.
- Validação de `appId` na sessão.
- Preferência de tema por usuário.
- Verificação de e-mail baseada em token com hash e expiração.
- Auditoria de alteração de tickets administrativos.
- Suíte unitária, build, lint e migrations validados.

## Ainda não significa produção

Os pontos abaixo continuam dependentes de configuração, homologação ou validação externa:

- PSP/gateway PIX real.
- Webhook real do PSP.
- Refund/cancelamento/reconciliação financeira.
- OAuth em configuração real.
- Provedor de e-mail.
- Push em dispositivos reais.
- Storage/publicação de assets gerados.
- Infraestrutura de produção.
- Backup e restore.
- Observabilidade operacional.
- E2E automatizado.
- Testes em Android/iOS físicos.
- Publicação nas lojas.

---

# 3. Bloqueadores P0 — obrigatórios antes de produção

| ID    | Item                 | Critério de aceite                                                             | Status |
| ----- | -------------------- | ------------------------------------------------------------------------------ | ------ |
| P0-01 | Ambiente de staging  | Ambiente isolado de produção, com variáveis próprias e banco próprio           | ⬜     |
| P0-02 | Ambiente de produção | API/app/backend publicados com HTTPS e configuração segura                     | ⬜     |
| P0-03 | Banco de produção    | Banco provisionado, migrations executadas e acesso restrito                    | ⬜     |
| P0-04 | Backup               | Backup automático configurado e restore testado                                | ⬜     |
| P0-05 | Domínio/HTTPS        | Domínio definitivo e certificados válidos                                      | ⬜     |
| P0-06 | Secrets              | Segredos fora do código e separados por ambiente                               | ⬜     |
| P0-07 | OAuth                | Client IDs, redirect URIs, state/PKCE e domínio homologados                    | ⬜     |
| P0-08 | CORS                 | `ALLOWED_ORIGINS` configurado para os domínios reais                           | ⬜     |
| P0-09 | PIX                  | PSP escolhido, credenciais de produção e criação de cobrança homologadas       | ⬜     |
| P0-10 | Webhook PIX          | Assinatura, idempotência, atualização de pagamento e eventos de erro validados | ⬜     |
| P0-11 | E-mail               | Provedor configurado e verificação de e-mail testada em produção controlada    | ⬜     |
| P0-12 | Push                 | Push real validado em Android e iOS                                            | ⬜     |
| P0-13 | Observabilidade      | Logs, erros, latência e disponibilidade monitorados com alertas                | ⬜     |
| P0-14 | E2E crítico          | Jornada principal automatizada e verde                                         | ⬜     |
| P0-15 | Dispositivos reais   | Android/iOS testados com rede normal, ruim, permissões e background            | ⬜     |

**Regra:** qualquer item P0 pendente mantém o Go-Live bloqueado.

---

# 4. Fase 1 — Infraestrutura de produção

## 4.1 Staging

Criar um ambiente equivalente à produção, mas isolado.

### Requisitos

- banco separado;
- secrets separados;
- domínio próprio;
- storage separado;
- OAuth separado quando o provedor permitir;
- webhook de pagamento apontando para sandbox;
- logs identificados como staging.

### Aceite

Um deploy de staging deve ser reproduzível e não pode acessar dados de produção.

---

## 4.2 Produção

Definir e provisionar:

- servidor/API;
- banco MariaDB;
- storage;
- domínio;
- HTTPS;
- DNS;
- variáveis de ambiente;
- política de firewall/rede;
- processo de deploy;
- processo de rollback.

### Aceite

Um novo deploy deve poder ser executado sem alteração manual de código no servidor.

---

# 5. Fase 2 — Banco, dados e recuperação

## Checklist

- [ ] Executar migrations em banco de produção.
- [ ] Validar foreign keys.
- [ ] Verificar índices das tabelas críticas.
- [ ] Configurar backup automático.
- [ ] Definir retenção.
- [ ] Fazer restore em ambiente separado.
- [ ] Registrar procedimento de recuperação.
- [ ] Criar rotina para verificar falha de backup.
- [ ] Fazer relatório de órfãos antes de aplicar migrations em qualquer base existente.

## Critério de aceite

É possível recuperar o ambiente a partir de um backup conhecido e validar integridade das tabelas essenciais.

---

# 6. Fase 3 — Pagamentos

Esta é uma das principais portas de entrada do dinheiro real.

## 6.1 PIX

O código já possui uma fronteira assinada/idempotente para webhook. Isso não substitui a homologação do PSP.

### Necessário

- escolher PSP;
- criar conta empresarial adequada;
- homologar API;
- configurar credenciais de produção;
- configurar webhook;
- configurar segredo de assinatura;
- validar status pendente;
- validar pago;
- validar expirado;
- validar falha;
- validar duplicidade de webhook;
- validar divergência entre PSP e banco;
- validar cancelamento/refund quando suportado;
- definir reconciliação financeira.

### Cenários obrigatórios

1. Cliente cria pedido.
2. PIX é gerado.
3. Pagamento fica pendente.
4. PSP confirma pagamento.
5. Webhook chega.
6. Evento é processado.
7. Mesmo webhook chega novamente.
8. Pedido não é duplicado.
9. Status financeiro é atualizado.
10. Lojista recebe autorização para prosseguir conforme regra de negócio.
11. Falha/expiração não libera pedido indevidamente.

## 6.2 Cartão

**Não liberar cartão no checkout enquanto não existir:**

- gateway real;
- tokenização segura;
- autorização/captura;
- webhook;
- idempotência;
- cancelamento;
- refund;
- tratamento de chargeback;
- reconciliação.

---

# 7. Fase 4 — Comunicação

## E-mail

Validar:

- cadastro;
- verificação;
- recuperação de conta;
- alteração de e-mail;
- links expirados;
- token reutilizado;
- domínio/remetente;
- entregabilidade.

Configurar:

- `EMAIL_WEBHOOK_URL`;
- `EMAIL_VERIFICATION_BASE_URL`.

## Push

Validar:

- novo pedido;
- atualização do pedido;
- atribuição de entrega;
- pedido pronto;
- pedido a caminho;
- pedido entregue;
- mensagens importantes.

Testar:

- app aberto;
- app em background;
- app encerrado;
- permissão negada;
- permissão concedida;
- token expirado/renovado;
- Android;
- iOS.

---

# 8. Fase 5 — E2E obrigatório

A ausência de E2E automatizado é uma das principais lacunas atuais.

## Jornada Cliente

- [ ] cadastro/login;
- [ ] localização;
- [ ] catálogo;
- [ ] produto;
- [ ] carrinho;
- [ ] checkout;
- [ ] pagamento;
- [ ] acompanhamento;
- [ ] cancelamento permitido;
- [ ] avaliação.

## Jornada Lojista

- [ ] cadastro;
- [ ] criação da loja;
- [ ] sessão como merchant;
- [ ] produtos;
- [ ] recebimento do pedido;
- [ ] aceite;
- [ ] preparo;
- [ ] pedido pronto.

## Jornada Entregador

- [ ] login;
- [ ] disponibilidade;
- [ ] atribuição;
- [ ] aceite;
- [ ] saída para entrega;
- [ ] entrega;
- [ ] atualização de localização.

## Jornada Administrativa

- [ ] autenticação;
- [ ] suporte;
- [ ] auditoria;
- [ ] alterações administrativas;
- [ ] validação de permissões.

---

# 9. Fase 6 — Testes de concorrência e segurança

Criar testes para:

- dois checkouts simultâneos;
- mesma chave de idempotência;
- dois webhooks iguais;
- duas mudanças de status de entrega;
- dois `complete` simultâneos;
- dois lançamentos de fiado;
- callback OAuth inválido;
- replay de OAuth;
- state inválido;
- origem não permitida;
- preflight CORS;
- cookie mutation de origem inválida;
- acesso indevido a storage;
- limites de voz;
- payload acima do limite.

---

# 10. Fase 7 — Dispositivos reais

## Android

Testar pelo menos:

- aparelho de entrada;
- aparelho intermediário;
- Android atualizado;
- Android com pouca memória;
- Wi-Fi;
- 4G/5G;
- internet instável;
- GPS desligado;
- permissão negada;
- app em background;
- app encerrado.

## iOS

Testar:

- login;
- localização;
- notificações;
- deep links;
- background;
- recuperação de sessão;
- checkout;
- comportamento após atualização.

---

# 11. Fase 8 — Observabilidade e operação

Antes do primeiro cliente real, a equipe deve conseguir responder:

- O servidor está online?
- O banco está saudável?
- Quantos pedidos estão ativos?
- Quantos pagamentos estão pendentes?
- Quantos pagamentos foram confirmados?
- Existem webhooks falhando?
- Existem pedidos travados?
- Existem entregas sem atualização?
- Existem erros de login?
- O push está funcionando?
- O e-mail está sendo entregue?
- A latência aumentou?
- Qual foi o último erro crítico?

## Alertas mínimos

- API indisponível;
- aumento de erros 5xx;
- banco indisponível;
- webhook de pagamento falhando;
- fila/outbox, quando implementada, acumulando;
- backup falhando;
- latência acima do limite;
- aumento anormal de pedidos/pagamentos com erro.

---

# 12. Fase 9 — Escalabilidade

O código atual possui controles process-local. Isso é aceitável para o primeiro ambiente controlado, mas não deve ser tratado como arquitetura distribuída.

Antes de escalar horizontalmente:

- [ ] Redis ou mecanismo equivalente para rate limit;
- [ ] circuit breaker distribuído;
- [ ] outbox transacional;
- [ ] worker de notificações;
- [ ] filas;
- [ ] métricas de banco;
- [ ] load test;
- [ ] teste de múltiplas instâncias.

---

# 13. Fase 10 — Publicação

## Google Play

- [ ] conta de desenvolvedor;
- [ ] app ID/package definitivo;
- [ ] ícone;
- [ ] screenshots;
- [ ] descrição;
- [ ] política de privacidade;
- [ ] classificação indicativa;
- [ ] permissões justificadas;
- [ ] build production;
- [ ] teste interno;
- [ ] teste fechado;
- [ ] release.

## Apple App Store

- [ ] Apple Developer;
- [ ] Bundle ID;
- [ ] certificados/provisionamento;
- [ ] App Store Connect;
- [ ] screenshots;
- [ ] descrição;
- [ ] política de privacidade;
- [ ] permissões;
- [ ] build production;
- [ ] TestFlight;
- [ ] validação;
- [ ] release.

---

# 14. Fase 11 — Piloto controlado

Não abrir imediatamente para o mercado inteiro.

## Modelo

### Etapa A — Homologação interna

Usuários controlados.

Objetivo: validar tecnologia.

### Etapa B — Piloto fechado

Poucos clientes, poucos lojistas e poucos entregadores.

Objetivo: validar operação real.

### Etapa C — Produção limitada

Aumentar volume gradualmente.

Objetivo: validar capacidade e suporte.

### Etapa D — Operação aberta

Liberar aquisição normal de clientes.

Objetivo: operação comercial.

---

# 15. Matriz de Go/No-Go

| Área            | Go quando                        | No-Go quando                                        |
| --------------- | -------------------------------- | --------------------------------------------------- |
| Segurança       | P0 de segurança validado         | Existe falha crítica aberta                         |
| Banco           | Backup + restore testados        | Não existe recuperação confiável                    |
| Pagamento       | PSP homologado                   | Pagamento depende de operação manual não controlada |
| Webhook         | Assinado + idempotente + testado | Eventos podem duplicar pedido/pagamento             |
| OAuth           | Fluxo real validado              | Callback ou sessão não homologados                  |
| E-mail          | Entrega real validada            | Verificação/recuperação não funcionam               |
| Push            | Android/iOS validados            | Notificações críticas falham                        |
| E2E             | Jornada principal verde          | Fluxo principal só foi testado manualmente          |
| Dispositivos    | Android/iOS reais aprovados      | Só preview/web foi validado                         |
| Observabilidade | Alertas operacionais ativos      | Falhas não são detectadas                           |
| Rollback        | Procedimento testado             | Não existe caminho de recuperação                   |
| Piloto          | Sem incidentes críticos          | Existem bloqueios operacionais                      |

---

# 16. Critérios de saída do Go-Live

O Pediu estará operacionalmente pronto quando:

- [ ] P0 = 100% concluído.
- [ ] Jornada cliente E2E = verde.
- [ ] Jornada lojista E2E = verde.
- [ ] Jornada entregador E2E = verde.
- [ ] Pagamento real = homologado.
- [ ] Webhook = homologado.
- [ ] Backup = validado.
- [ ] Restore = validado.
- [ ] OAuth = homologado.
- [ ] E-mail = homologado.
- [ ] Push = homologado.
- [ ] Android = aprovado.
- [ ] iOS = aprovado.
- [ ] Observabilidade = ativa.
- [ ] Alertas = ativos.
- [ ] Rollback = testado.
- [ ] Piloto fechado = concluído.
- [ ] Nenhum incidente crítico aberto.

---

# 17. Ordem de execução recomendada

## Sprint 1 — Infraestrutura

1. Staging.
2. Produção.
3. Banco.
4. Backup.
5. HTTPS/domínio.
6. Secrets.
7. Observabilidade.

## Sprint 2 — Integrações externas

1. PSP PIX.
2. Webhook.
3. E-mail.
4. OAuth.
5. Push.
6. Storage.

## Sprint 3 — Qualidade

1. E2E cliente.
2. E2E lojista.
3. E2E entregador.
4. E2E administrativo.
5. Concorrência.
6. Segurança HTTP.

## Sprint 4 — Dispositivos e publicação

1. Android.
2. iOS.
3. Testes de rede.
4. Testes de permissões.
5. TestFlight.
6. Google Play internal/closed testing.

## Sprint 5 — Piloto

1. Grupo controlado.
2. Monitoramento diário.
3. Correção de incidentes.
4. Regressão.
5. Expansão gradual.

---

# 18. Pós-Go-Live

Durante os primeiros dias de operação, acompanhar diariamente:

- pedidos criados;
- pedidos cancelados;
- pagamentos pendentes;
- pagamentos confirmados;
- pagamentos divergentes;
- tempo médio de preparo;
- tempo médio de entrega;
- erros 4xx/5xx;
- falhas de webhook;
- falhas de push;
- falhas de e-mail;
- chamados de suporte;
- crashes mobile;
- consumo de banco;
- uso de storage.

Qualquer incidente crítico deve interromper a expansão do piloto até causa, correção e regressão serem identificadas.

---

# 19. Referências técnicas

Este plano foi consolidado a partir dos documentos de auditoria existentes no repositório:

- `docs/RELATORIO_AUDITORIA_COMPLETA_DELIVERY_2026-09-22.md`
- `docs/INSTRUCAO_CORRECAO_15_ACHADOS_2026-09-22.md`

A auditoria registrou como validações pós-correção:

- `pnpm check` — passou;
- `pnpm test` — 22 arquivos, 90 testes aprovados e 1 teste pulado;
- `pnpm build` — passou;
- `pnpm lint` — passou;
- `git diff --check` — passou;
- migrations MariaDB `0000`–`0023` — passaram;
- 34 tabelas e 49 FKs na validação de banco vazio;
- testes focados de segurança/admin/entrega — passaram;
- E2E automatizado — ainda ausente.

**Importante:** este documento não afirma que provedores externos, contas, credenciais, infraestrutura ou lojas de aplicativos já estejam configurados. Ele define o caminho necessário para chegar a esse estado.

---

# 20. Regra operacional do projeto

> **Não adicionar complexidade de produto antes de fechar a operação básica.**

A prioridade agora é transformar o que já existe em uma operação confiável.

**Sequência:**  
**Infraestrutura → Dinheiro → Comunicação → E2E → Dispositivos → Publicação → Piloto → Escala**

**Objetivo final:** colocar o Pediu no mercado com capacidade de receber pedidos reais, processar pagamentos reais, acompanhar entregas reais e detectar/falhar com segurança quando algo sair do esperado.

---

# 21. Registro de execução — 25/09/2026

A execução do plano foi iniciada no head do PR #7 (`38045bfa56010f8b2a3cadd531c79ad1511d9173`). O primeiro incremento versionado é o `Go-Live Readiness Check`, disponível por `pnpm go-live:check` em `scripts/go-live-readiness.ts`.

O checker valida configuração mínima de runtime, conexão de banco, migrations e tabelas críticas, health check da API e a presença não revelada de configurações de PIX, webhook, OAuth, e-mail e storage. Também mantém explicitamente como `NOT_CONFIGURED` as dependências que exigem PSP, backup/restore, push em Android/iOS, E2E crítico, dispositivos reais e observabilidade externa. Em produção, configuração mínima ausente ou wildcard em `ALLOWED_ORIGINS` resulta em `BLOCKED`.

## Evidência local

No ambiente E2E local, o checker respondeu `3 PASS`, `0 BLOCKED` e `10 NOT_CONFIGURED`. Foram confirmados HTTP 200 da API, 14 migrations e as 9 tabelas críticas exigidas pelo smoke operacional. Nenhum valor de segredo foi impresso.

A implementação foi validada adicionalmente com `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm exec prettier --check` e `git diff --check`. A suíte atual deste head passou com 26 arquivos, 101 testes aprovados e 1 teste ignorado. O workflow operacional foi atualizado para executar o checker depois do health check da API.

## Estado dos bloqueadores

Este incremento **não conclui nenhum P0 externo**. PSP PIX, webhook real, OAuth de produção, e-mail, push, backup/restore, observabilidade, E2E completo e dispositivos reais permanecem pendentes até que existam credenciais, ambientes, homologação e evidências correspondentes. O status geral continua `🟡 Em preparação para Go-Live` e o Go-Live comercial permanece bloqueado conforme a regra do plano.

---

# 22. Registro de execução — jornada E2E vertical do cliente — 25/09/2026

O segundo incremento executável foi implementado sobre o head do PR #7. Foram adicionados `scripts/go-live-client-e2e.ts`, o comando `pnpm go-live:e2e`, a etapa correspondente no workflow operacional e a instrução técnica `docs/INSTRUCAO_FASE_E2E_CLIENTE_PR7.md`.

A jornada usa uma API Express real, sessão Bearer emitida pelo SDK com identidade de teste e um banco MySQL limpo. O fixture cria usuário cliente, usuário lojista, loja aberta e produto disponível com identificadores únicos; ao final, remove os registros criados.

| Etapa            | Evidência automatizada                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Catálogo         | Produto fixture retornado pelo marketplace com loja e categoria corretas                    |
| Localização      | Endereço persistido com latitude, longitude e seleção como padrão                           |
| Quote            | Preço, taxa de entrega e total calculados pelo servidor                                     |
| Checkout         | Pedido criado usando endereço autorizado e total recalculado                                |
| Pagamento        | PIX criado e mantido em `pending`; nenhum estado `paid` é fabricado                         |
| Idempotência     | Repetição da mesma chave devolve o mesmo pedido/pagamento e mantém uma linha em cada tabela |
| Operação lojista | Pedido visível para o lojista e progressão `Pendente → Aceito → Preparando → Pronto`        |
| Acompanhamento   | Pedido final e eventos persistidos confirmados pelo cliente                                 |

A execução local em banco limpo aplicou as 24 migrations versionadas e passou com a mensagem `Go-Live client E2E smoke passed`. O banco de preview híbrido anterior foi deliberadamente descartado como evidência: ele tinha tabelas antigas de anúncios, mas não possuía `users.themePreference`, demonstrando por que o smoke deve sempre começar de um schema limpo.

Este incremento cobre um smoke de API integrado, não substitui cadastro/login OAuth real, permissões nativas de localização, carrinho na UI, pagamento confirmado por PSP, webhook, rastreamento GPS, cancelamento, avaliação, push ou teste em Android/iOS. As caixas da jornada completa continuam pendentes até essas evidências serem produzidas.

---

# 23. Registro de execução — estresse e verificação de implantação — 25/09/2026

A terceira etapa executável foi adicionada antes de qualquer nova fatia funcional. Foram criados `scripts/go-live-stress.ts`, `scripts/go-live-deployment.ts`, os comandos `pnpm go-live:stress` e `pnpm go-live:deployment`, além dos workflows `Pediu Operational Validation` e `Pediu Deployment Smoke`.

O teste de estresse é deliberadamente somente leitura: alterna entre `GET /api/health` e `pediu.marketplace.search`, possui timeout, limite de requisições, limite de concorrência, orçamento de p95 e bloqueio explícito para hosts remotos sem `STRESS_ALLOW_REMOTE=1`. Assim, ele não cria pedidos, pagamentos ou dados de negócio.

## Evidências executadas

| Ambiente                                                   |                             Carga | Resultado                                            |
| ---------------------------------------------------------- | --------------------------------: | ---------------------------------------------------- |
| API iniciada com bundle de produção e banco limpo          |      120 requisições / 12 workers | 0% erro; p50 20,1 ms; p95 64,4 ms; máximo 76,8 ms    |
| Processo `NODE_ENV=production` na porta 3001 (passo do CI) |        60 requisições / 8 workers | 0% erro; p50 14,6 ms; p95 40,1 ms; máximo 62,4 ms    |
| URL HTTPS pública temporária da sandbox                    |        40 requisições / 4 workers | 0% erro; p50 11,1 ms; p95 53,7 ms; máximo 144,8 ms   |
| Smoke do bundle de produção local                          | health + marketplace + CORS exato | aprovado; health 200, marketplace 200, preflight 204 |

A URL pública temporária utilizada foi `https://3000-iue696glzt2dfr1suc5xk-6d6ba285.us1.manus.computer`. Ela comprova o caminho HTTP implantado na sandbox, mas não é staging ou produção permanente.

A auditoria de implantação encontrou zero deployments GitHub para este repositório e nenhum projeto Vercel associado ao Pediu. Por isso, o repositório agora contém um workflow manual `Pediu Deployment Smoke`: quando houver uma URL de staging/produção, ele exige a URL, valida health/marketplace/CORS e executa carga read-only antes do aceite operacional.

## Estado operacional

O baseline de código e implantação está verde. O PSP PIX continua pendente por depender da criação do CNPJ, escolha de provedor, credenciais e homologação. A existência de um baseline verde não transforma a sandbox em produção nem substitui domínio, banco, secrets, backup/restore, observabilidade, OAuth/e-mail/push e dispositivos reais; esses itens precisam ser confirmados no ambiente definitivo antes do Go-Live comercial. Nenhuma nova etapa funcional deve ser considerada concluída sem repetir estresse e smoke de implantação.

---

# 24. Registro de execução — E2E operacional de lojista e entrega — 25/09/2026

A próxima fatia vertical foi implementada como `scripts/go-live-operations-e2e.ts` e integrada ao workflow operacional pelo comando `pnpm go-live:operations-e2e`. O smoke cria fixture isolada, usa Bearer de teste, percorre o fluxo de lojista e entrega, valida o acompanhamento pelo cliente e remove os dados ao terminar.

Na primeira execução contra MariaDB real, o E2E encontrou uma regressão que os mocks unitários não capturavam: o `UPDATE` alterava corretamente o status do pedido para `A caminho`, mas a leitura direta de `affectedRows` no retorno do Drizzle não funcionava em todos os formatos do driver. Como consequência, o evento `A caminho` não era criado. Foi corrigido o helper `getAffectedRows`, aceitando tanto o cabeçalho direto quanto o cabeçalho retornado em array, e a mesma normalização foi aplicada à conclusão de entrega e ao status administrativo de suporte.

Após a correção, o E2E passou em banco limpo: `Pendente → Aceito → Preparando → Pronto → A caminho → Entregue`, atribuição ao lojista, localização com ETA, consulta do tracking pelo cliente, conclusão idempotente e cleanup do fixture. Esta descoberta reforça a regra de não avançar apenas com mocks: cada fatia deve atravessar o banco e o processo de produção reais.

O PSP PIX continua fora deste smoke e permanece pendente de CNPJ, provedor, credenciais e homologação.

Durante a repetição do smoke público, o primeiro preflight retornou 403 porque a instância temporária tinha `ALLOWED_ORIGINS` somente com `http://localhost:8081`. O código bloqueou corretamente a origem HTTPS não declarada. A instância foi reiniciada com as origens local e pública explícitas; o smoke então passou com CORS exato e o estresse público voltou a zero erro. Essa evidência deve ser reproduzida com os domínios definitivos no staging/produção.

---

# 25. Revalidação do ambiente próprio do entregador — 26/09/2026

A fatia courier foi reaplicada sobre o head do PR #7 e revalidada antes de qualquer avanço:

- MariaDB limpo: 25 migrations, 37 tabelas, 56 FKs e `users.role` com `courier`.
- E2E contra bundle de produção em `127.0.0.1:3002`: cadastro do courier, aprovação administrativa, vínculo com a loja, disponibilidade, oferta, aceite transacional, consentimento de localização, GPS, tracking do cliente e conclusão idempotente.
- Cleanup confirmado: zero usuários `ci-ops-*` e zero auditorias residuais após o smoke.
- Deployment smoke: health, marketplace e CORS exato aprovados.
- Estresse read-only: 120 requests, concorrência 12, p95 de 49,2 ms, erro 0%.
- Matriz local: `pnpm check`, `pnpm test` (105 passed, 1 skipped), `pnpm build`, `pnpm lint` e `git diff --check` aprovados.

O PSP e repasse financeiro do entregador continuam pendentes exclusivamente por CNPJ, provedor, credenciais e homologação; nenhum pagamento foi simulado como concluído.

---

# 26. Backup e restauração — 26/09/2026

A próxima etapa executável adicionou `scripts/go-live-backup-restore.ts`, o comando `pnpm go-live:backup-restore` e um gate obrigatório no workflow operacional. O smoke faz dump lógico com transação consistente, restaura em banco temporário isolado, compara a estrutura, o journal de migrations e as contagens de linhas críticas, e remove o banco temporário e o arquivo de dump mesmo quando ocorre falha.

Na validação local contra MariaDB real, o backup/restore passou com 37 tabelas, 25 migrations e 7 verificações de contagem de linhas. O cleanup confirmou zero banco temporário e zero arquivo de dump residual. O mesmo gate usa a credencial administrativa do MySQL de CI e não altera a base de origem.

Após a restauração, o bundle `NODE_ENV=production` foi iniciado em `127.0.0.1:3003`. O deployment smoke passou com health 200, marketplace 200 e CORS exato. O stress read-only passou com 120 requests, concorrência 12, p95 de 73,4 ms, máximo de 85,7 ms e taxa de erro 0%.

Esta etapa valida recuperação lógica em ambiente controlado; backup agendado, retenção, armazenamento externo, criptografia, alertas de falha e restore de produção continuam dependentes da infraestrutura definitiva e permanecem P0.

---

# 27. Observabilidade operacional mínima — 26/09/2026

Foi implementado um endpoint protegido `GET /api/metrics`, com token Bearer em `OBSERVABILITY_TOKEN`, comparação em tempo constante, `Cache-Control: no-store` e ausência de exposição de payloads de usuário. O coletor mantém contagem, erros, taxa de erro, média, p95 aproximado por buckets, máximo e uptime; a cardinalidade de procedimentos é limitada a 256 entradas para evitar crescimento sem teto em processo.

O runtime de produção agora bloqueia o boot quando `OBSERVABILITY_TOKEN` não está configurado. O deployment smoke passou validando health 200, marketplace 200, CORS exato e `metrics=protected`; sem token, a chamada recebeu 401. O stress read-only passou com 120 requests, concorrência 12, p95 de 55,8 ms, máximo de 70,2 ms e taxa de erro 0%.

A matriz local passou com `pnpm check`, `pnpm test` (107 passed, 1 skipped), `pnpm build`, `pnpm lint`, testes específicos de observabilidade e `git diff --check`. O token protege o endpoint, mas envio para um SaaS externo, dashboards, alertas e retenção centralizada continuam dependentes da infraestrutura definitiva e não são considerados concluídos por este incremento.

---

# 28. Concorrência e idempotência de checkout/webhook — 26/09/2026

A fase de concorrência foi implementada sobre o head do PR #7 com `scripts/go-live-concurrency.ts`, o comando `pnpm go-live:concurrency`, o helper `isUniqueConstraintError` e recuperação transacional nos caminhos de checkout e webhook. A instrução técnica está em `docs/INSTRUCAO_FASE_CONCORRENCIA_PR7.md`.

Na primeira execução contra MariaDB real, o smoke encontrou duas corridas que mocks não capturavam:

- 12 checkouts com a mesma chave retornavam HTTP 500 ao perder a unique key de `pediu_orders_idempotency_unique`;
- depois da correção do checkout, 12 webhooks HMAC idênticos retornavam uma resposta 200 e onze 422 por colisão em `(provider, providerEventId)` de `pediu_webhook_events`.

O checkout agora relê o pedido/pagamento vencedor após conflito único. `applyPaymentWebhook` mantém a transação como autoridade e, quando perde a inserção concorrente do evento, relê o evento e o pagamento persistidos; erros não relacionados continuam sendo propagados. O detector percorre envelopes `cause`, `originalError` e `driverError`, com regressão unitária para códigos, errno, mensagens encapsuladas e erro irrelevante.

## Evidências executadas

| Validação                                                                            | Resultado                                                                                                                                                                               |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Smoke de concorrência em bundle `NODE_ENV=production`, MariaDB real, 12 concorrentes | 12 checkouts convergiram para 1 pedido/pagamento; 12 webhooks convergiram para 1 evento; todas as respostas foram aceitas e o cleanup da fixture passou                                 |
| Repetição ampliada no mesmo bundle, 24 concorrentes                                  | 24 checkouts convergiram para 1 pedido/pagamento; 24 webhooks convergiram para 1 evento                                                                                                 |
| Deployment smoke em `127.0.0.1:3004`                                                 | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                                                                                                 |
| Stress read-only no bundle de produção                                               | 120 requests / 12 workers; p50 20,9 ms; p95 34,1 ms; máximo 73,7 ms; erro 0%                                                                                                            |
| Suíte e qualidade local                                                              | 28 arquivos passaram, 115 testes passaram e 1 foi ignorado; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier dos arquivos de código/configuração da fase e `git diff --check` passaram |

O workflow `Pediu Operational Validation` passou a injetar `PAYMENT_WEBHOOK_SECRET` de teste e executar o smoke concorrente após os E2Es de lojista/entrega. A carga do CI é limitada a 12 concorrentes e usa somente fixtures isoladas.

Esta entrega cobre apenas checkout com a mesma chave e webhook com o mesmo evento. Não conclui a Fase 6 inteira: concorrência de status/`complete`, fiado, OAuth, CORS, storage, voz e limites de payload continuam como incrementos próprios. PSP/PIX, webhook real do provedor, CNPJ, credenciais, refund e reconciliação permanecem pendentes; nenhum pagamento real foi simulado como homologado. O Go-Live comercial continua bloqueado pelos P0 externos e operacionais do plano.

---

# 29. Concorrência de status e conclusão de entrega — 26/09/2026

A próxima fatia da Fase 6 foi implementada sobre o PR #7 com atualização condicional de status e regressões concorrentes no E2E operacional. A instrução técnica está em `docs/INSTRUCAO_FASE_CONCORRENCIA_ENTREGA_PR7.md`.

`updateOrderStatus` agora recebe o status esperado e só atualiza a linha quando o pedido ainda está nesse estado. Quando outra chamada vence a corrida, a rota trata a repetição do mesmo status como sucesso idempotente, não cria evento/notificação duplicado e rejeita uma transição stale diferente. A conclusão `A caminho → Entregue` já era condicional e transacional; o E2E passou a enviar duas conclusões simultâneas para proteger esse contrato.

## Evidências executadas

| Validação                                  | Resultado                                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline antes da alteração                | Deployment smoke aprovado; stress 120/12 com p95 de 45,1 ms e erro 0%; checkout/webhook concorrente aprovado                                                            |
| Regressões unitárias focadas               | 13 testes aprovados para transição idêntica, retry já aplicado, transição stale e conclusão simultânea                                                                  |
| E2E operacional real                       | Três execuções consecutivas aprovadas com onboarding courier, fluxo de entrega, duas chamadas paralelas por status e duas conclusões paralelas; zero fixtures residuais |
| Deployment smoke final em `127.0.0.1:3004` | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                                                                                 |
| Stress final read-only                     | 120 requests / 12 workers; p50 14,0 ms; p95 34,8 ms; máximo 62,5 ms; erro 0%                                                                                            |
| Matriz local final                         | 28 arquivos, 119 testes aprovados e 1 ignorado; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier dos arquivos da fase e `git diff --check` aprovados                   |

O primeiro run remoto do Operational Validation encontrou um timing que as execuções locais anteriores não haviam capturado: a segunda chamada podia ler `Aceito` já persistido e falhava ao validar a transição impossível `Aceito → Aceito`. A rota passou a tratar o status já persistido como retry idempotente, sem gravar evento/notificação, e foi adicionada regressão unitária. A reprodução local posterior passou três vezes consecutivas e os gates finais permaneceram verdes.

O commit de correção `0a083e1` passou no CI (`36238830915`) e no `Pediu Operational Validation` (`36238830911`), incluindo o E2E de lojista/entrega com o timing anteriormente falho, o smoke de checkout/webhook concorrente, deployment smoke e stress. A fase está concluída neste escopo; os bloqueadores externos do Go-Live comercial permanecem os mesmos do plano.

O workflow operacional já contém o E2E de lojista/entrega e passará a executar este cenário concorrente por meio do script atualizado. Esta entrega cobre status idêntico/stale e `complete` concorrente; fiado, OAuth, CORS, storage, voz e limites de payload continuam pendentes. PSP/PIX, webhook real, CNPJ, credenciais, refund, reconciliação e infraestrutura externa permanecem bloqueadores do Go-Live comercial.

---

# 30. Concorrência de fiado e proteção do limite de crédito — 26/09/2026

A próxima fatia da Fase 6 foi implementada sobre o PR #7 com lock pessimista do cliente, retry fiado idempotente e smoke de oversubscription. A instrução técnica está em `docs/INSTRUCAO_FASE_CONCORRENCIA_FIADO_PR7.md`.

`createOrderWithFiado` agora bloqueia o registro de `pediu_customers` com `SELECT ... FOR UPDATE` dentro da transação. Depois de obter o lock, a operação relê a chave de idempotência; somente uma transação cria pedido/itens, atualiza saldo, lança ledger e cria pagamento fiado. A segunda chamada com a mesma chave retorna o pedido já persistido sem repetir efeitos. Chaves diferentes são serializadas e uma segunda compra que excede o limite é rejeitada sem sobrescrever o saldo.

A rota preserva `paymentId: null` para fiado em todos os caminhos de retry. Durante a validação real, o smoke descobriu primeiro que a recuperação genérica expunha o ID do pagamento fiado e, depois, que o pré-check inicial também retornava esse ID. Ambos os caminhos foram separados e cobertos por regressão unitária; nenhum pagamento externo foi usado.

## Evidências executadas

| Validação                                      | Resultado                                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline antes da alteração                    | Deployment smoke aprovado; stress 120/12 com p50 13,5 ms, p95 27,5 ms, máximo 60,8 ms e erro 0%; checkout/webhook concorrente aprovado                           |
| Regressões unitárias focadas                   | 6 testes de fiado aprovados, incluindo retry encontrado no pré-check                                                                                             |
| Smoke fiado real ampliado                      | Três execuções finais aprovadas; mesma chave convergiu para um crédito e chaves diferentes produziram uma aprovação e uma rejeição por limite, sem saldo perdido |
| E2E operacional e checkout/webhook concorrente | Ambos aprovados no bundle final                                                                                                                                  |
| Deployment smoke final em `127.0.0.1:3004`     | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                                                                          |
| Stress final read-only                         | 120 requests / 12 workers; p50 17,0 ms; p95 47,8 ms; máximo 62,7 ms; erro 0%                                                                                     |
| Cleanup SQL                                    | Zero usuários, pedidos, clientes e fixtures concorrentes residuais                                                                                               |
| Matriz local final                             | 28 arquivos, 120 testes aprovados e 1 ignorado; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier dos arquivos da fase e `git diff --check` aprovados            |

O workflow operacional recebeu `pnpm go-live:fiado-concurrency` após o E2E de lojista/entrega. Esta entrega fecha apenas a concorrência do crédito interno; PSP/PIX real, CNPJ, webhook real de provedor, credenciais externas, cobrança/reconciliação, OAuth, CORS, storage, voz e demais dependências do plano continuam sem evidência de produção e impedem declarar Go-Live comercial READY.

O commit `7fdda14` passou no CI (`36239443014`) e no `Pediu Operational Validation` (`36239443036`), incluindo migrações limpas, E2Es de cliente/lojista/entrega, o smoke de fiado, checkout/webhook concorrente, deployment smoke e stress. A fase está concluída neste escopo; o Go-Live comercial continua bloqueado pelas dependências externas e operacionais registradas no plano.

---

# 31. Segurança do callback OAuth — 27/09/2026

A próxima fatia da Fase 6 foi implementada sobre o PR #7 com validação estrita de `state`, bloqueio de replay do authorization code e regressões HTTP do callback. A instrução técnica está em `docs/INSTRUCAO_FASE_OAUTH_SEGURANCA_PR7.md`.

O SDK agora rejeita state vazio, não canônico ou malformado e aceita somente redirect URIs com `http`, `https` ou o esquema nativo `pediupediu`, sem credenciais ou fragmentos. Os callbacks web e mobile falham com HTTP 400 antes de contactar o provedor quando o state é inválido. Uma guarda processual de TTL curto, com cardinalidade limitada e chave hash do código, bloqueia replay antes da troca de token e libera a tentativa quando há falha transitória. Nenhum código, token ou state é registrado em logs.

## Evidências executadas

| Validação                                  | Resultado                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline antes da alteração                | Deployment smoke aprovado; stress 120/12 com p50 13,7 ms, p95 29,8 ms, máximo 65,8 ms e erro 0%; checkout/webhook e fiado concorrentes aprovados |
| Regressões OAuth focadas                   | 6 testes aprovados para state inválido, protocolo/credenciais/fragmento inseguros, replay e retry após falha                                     |
| Matriz local final                         | 29 arquivos, 126 testes aprovados e 1 ignorado; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados                 |
| Callback inválido no bundle compilado      | HTTP 400 com `invalid OAuth state`, sem chamada ao provedor                                                                                      |
| Deployment smoke final em `127.0.0.1:3004` | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                                                          |
| Stress final read-only                     | 120 requests / 12 workers; p50 19,1 ms; p95 42,5 ms; máximo 65,6 ms; erro 0%                                                                     |
| Regressões operacionais                    | E2E courier, checkout/webhook concorrente e fiado ampliado aprovados após a recompilação                                                         |

Esta entrega endurece a fronteira local, mas não homologa OAuth real. Provedor, credenciais, redirect URIs definitivas, execução em web/domínio real, deep-link em Android/iOS e homologação do fluxo continuam dependências externas. PSP/PIX, CNPJ, webhook real, cobrança/reconciliação, e-mail, push, storage, observabilidade externa e demais itens do plano continuam sem evidência de produção; o Go-Live comercial permanece bloqueado.

O commit `0a3fc50` passou no CI (`36316685469`) e no `Pediu Operational Validation` (`36316685457`), incluindo migrations limpas, E2Es operacionais, deployment smoke e stress. A fase está concluída neste escopo; OAuth real continua pendente até existir provedor, credenciais, redirect URIs definitivas e homologação real.

---

# 32. CORS, origem e cookie mutation — 27/09/2026

A próxima fatia da Fase 6 transformou os controles de origem já existentes em um smoke HTTP real e adicionou regressões explícitas para cookie de sessão. O comando `pnpm go-live:cors-security` foi versionado e incluído no `Pediu Operational Validation`. Durante a ativação do teste foi encontrada e corrigida uma falha de robustez: `getSessionCookieOptions` podia quebrar se um request de teste não tivesse `hostname`; agora há fallback seguro para `localhost`.

O smoke prova que preflight e mutation de origem permitida funcionam sem wildcard, que preflight e mutation de origem proibida retornam 403 sem ecoar `Access-Control-Allow-Origin`, que um cliente nativo com Bearer atravessa a barreira de cookie e que o logout mantém cookie `HttpOnly`, `Path=/` e `SameSite=Lax`. A regra existente de CORS continua permitindo apenas origens configuradas e a configuração de produção continua proibindo wildcard.

## Evidências executadas

| Validação                                  | Resultado                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline antes da fase                     | Deployment smoke, stress 120/12, checkout/webhook concorrente e fiado concorrente aprovados                                                 |
| Regressões focadas                         | Logout ativado e 5 testes de segurança aprovados; cookie HTTPS e HTTP cobertos com `Secure` coerente, `HttpOnly`, `SameSite=Lax` e `Path=/` |
| Matriz local final                         | 30 arquivos, 128 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados                         |
| Smoke CORS no bundle recompilado           | Preflight/mutation permitidos aprovados; preflight/mutation proibidos bloqueados; Bearer nativo aprovado; cookie protegido aprovado         |
| Deployment smoke final em `127.0.0.1:3004` | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                                                     |
| Stress final read-only                     | 120 requests / 12 workers; p50 17,2 ms; p95 44,1 ms; máximo 63,2 ms; erro 0%                                                                |
| Regressões operacionais                    | E2E courier, checkout/webhook concorrente e fiado ampliado aprovados após a recompilação                                                    |

Esta fase cobre o guardrail do servidor, não configura os domínios definitivos. Origens reais de staging/produção, HTTPS público, domínio de cookie, OAuth real, PSP/PIX, CNPJ, webhook de provedor, cobrança/reconciliação, e-mail, push, storage, observabilidade externa e dispositivos físicos continuam dependências externas; o Go-Live comercial permanece bloqueado.

O commit `c40a4cf` passou no CI (`36317097963`) e no `Pediu Operational Validation` (`36317097959`), que executou também o novo `go-live:cors-security`. A fase está concluída neste escopo; as origens e domínios externos definitivos continuam pendentes.

---

# 33. Autorização de storage e isolamento de namespace — 27/09/2026

A fatia de storage da Fase 6 foi implementada como um smoke HTTP real sobre o proxy existente, sem fabricar backend, URL assinada ou asset. O comando `pnpm go-live:storage-security` foi versionado e incluído no `Pediu Operational Validation`. A instrução técnica está em `docs/INSTRUCAO_FASE_STORAGE_SEGURANCA_PR7.md`.

O smoke criou dois usuários temporários e comprovou que path traversal falha com 400 antes de autenticação, acesso anônimo retorna 401, tentativa de ler `voice/{outroUsuario}` retorna 403 e o namespace do próprio usuário não revela URL nem erro do backend: retorna 503 porque o storage externo não está configurado. O cleanup das fixtures ocorre em `finally` e foi concluído sem deixar dependências funcionais.

## Evidências executadas

| Validação                                  | Resultado                                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline antes da fase                     | Deployment smoke, stress 120/12, CORS, checkout/webhook concorrente e fiado concorrente aprovados; stress p50 19,5 ms, p95 36,2 ms, máximo 70,9 ms e erro 0% |
| Smoke de storage no bundle real            | Traversal 400, anônimo 401, namespace cruzado 403 e namespace próprio 503 sem backend externo; cleanup isolado aprovado                                      |
| Matriz local final                         | 30 arquivos, 128 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados                                          |
| Deployment smoke final em `127.0.0.1:3004` | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                                                                      |
| Stress final read-only                     | 120 requests / 12 workers; p50 19,8 ms; p95 37,1 ms; máximo 68,9 ms; erro 0%                                                                                 |
| Regressões operacionais                    | CORS, E2E courier, checkout/webhook concorrente e fiado ampliado aprovados após a execução final                                                             |

A fase prova autorização e falha segura, não homologa storage real. Backend externo, bucket, presign, assets gerados, domínio/HTTPS definitivos, OAuth, PSP/PIX, CNPJ, webhook de provedor, cobrança/reconciliação, e-mail, push, observabilidade externa e dispositivos físicos continuam dependências externas; o Go-Live comercial permanece bloqueado.

O commit `911c910` passou no CI (`36317506563`) e no `Pediu Operational Validation` (`36317506600`), que executou também o novo `go-live:storage-security`. A fase está concluída neste escopo; storage externo continua pendente até configuração e homologação reais.

---

# 34. Limites de voz e payload — 27/09/2026

A última fatia da Fase 6 adicionou regressões e smoke operacional para os limites de entrada já definidos no servidor. O comando `pnpm go-live:limits-security` foi versionado e incluído no `Pediu Operational Validation`; a instrução técnica está em `docs/INSTRUCAO_FASE_LIMITES_VOZ_PAYLOAD_PR7.md`.

O smoke HTTP contra o bundle real enviou payload JSON sintético acima de 16 MB e obteve HTTP 413 antes do router. Também enviou comando de voz acima de 500 caracteres e obteve HTTP 400 antes de executar interpretação. As regressões unitárias cobrem entrada base64 acima do limite codificado, base64 malformado, áudio decodificado abaixo de 1 KB e assinatura incompatível com o MIME, impedindo chegar a storage ou transcrição.

## Evidências executadas

| Validação                                  | Resultado                                                                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline antes da fase                     | Deployment smoke, stress 120/12, CORS, storage, checkout/webhook concorrente e fiado concorrente aprovados; stress p50 15,0 ms, p95 29,9 ms, máximo 69,1 ms e erro 0% |
| Regressões focadas                         | 5 testes de limites de voz e payload aprovados                                                                                                                        |
| Smoke no bundle real                       | Payload JSON acima de 16 MB retornou 413; comando de voz com 501 caracteres retornou 400                                                                              |
| Matriz local final                         | 31 arquivos, 133 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados                                                   |
| Deployment smoke final em `127.0.0.1:3004` | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                                                                               |
| Stress final read-only                     | 120 requests / 12 workers; p50 15,3 ms; p95 29,9 ms; máximo 68,5 ms; erro 0%                                                                                          |
| Regressões operacionais                    | CORS, storage, checkout/webhook concorrente e fiado ampliado aprovados após a execução final                                                                          |

Esta fase endurece limites locais, mas não homologa transcrição real, LLM, storage externo, captura de áudio de usuário, provedor de voz ou payloads de produção. OAuth, PSP/PIX, CNPJ, webhook de provedor, cobrança/reconciliação, e-mail, push, observabilidade externa e dispositivos físicos continuam dependências externas; o Go-Live comercial permanece bloqueado.

O commit `978d09a` passou no CI (`36317926354`) e no `Pediu Operational Validation` (`36317926344`), que executou também o novo `go-live:limits-security`. A fase está concluída neste escopo; integrações externas de voz e domínios de produção continuam pendentes.

---

# 35. Pré-validação de dispositivos Expo — 28/09/2026

A próxima etapa executável da Fase 7 foi iniciada com `scripts/device-preflight.ts`, `scripts/go-live-device-preflight.ts`, o comando `pnpm go-live:device-preflight`, regressões unitárias e a instrução `docs/INSTRUCAO_FASE_DISPOSITIVOS_REAIS_PR7.md`. O preflight valida a identidade nativa `Pediu`, scheme `pediupediu`, bundle ID iOS, package Android, dependências e plugins Expo, perfis EAS, URL HTTPS pública do backend e alinhamento entre `EXPO_PUBLIC_APP_ID` e `VITE_APP_ID`.

## Evidências executadas

| Validação                                                         | Resultado                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Preflight estrutural com API pública temporária e app ID alinhado | `PASS=6`, `BLOCKED=0`, `NOT_CONFIGURED=5`                                                                           |
| Regressões focadas                                                | 4 testes aprovados para identidade, URL local inválida, app ID divergente e ausência de evidência física            |
| Matriz local final                                                | 32 arquivos, 137 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados |
| Deployment smoke após a alteração                                 | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                             |
| Stress final após a alteração                                     | 120 requests / 12 workers; p50 24,2 ms; p95 88,4 ms; máximo 145,2 ms; erro 0%                                       |
| Operational Validation                                            | O workflow recebeu o passo `pnpm go-live:device-preflight`, sem transformar ausência de dispositivos em falso verde |

O preflight deixou explicitamente como `NOT_CONFIGURED` OAuth real, Forge para push/storage, PSP/PIX e evidência física Android/iOS. A Fase 7 não está concluída: ainda faltam aparelhos Android e iOS reais, permissões, background, rede instável, GPS, notificações, deep links, recuperação de sessão e checkout observados em dispositivos físicos. Preview web e Expo Go comprovam o bundle de desenvolvimento, mas não substituem a matriz real. PSP/PIX, CNPJ, OAuth, push, storage externo, e-mail, observabilidade externa, staging/produção definitivos e publicação nas lojas continuam bloqueadores comerciais do Go-Live.

---

# 36. Compatibilidade nativa Expo SDK 54 — 28/09/2026

A pré-validação de dispositivos revelou um bloqueador nativo real: `expo-audio` exigia a peer dependency `expo-asset`, que não estava declarada diretamente. A etapa também encontrou versões patch desatualizadas do SDK 54 e os config plugins ausentes de `expo-font` e `expo-web-browser` no app config dinâmico.

A correção adicionou `expo-asset` na lista de dependências, declarou os plugins nativos necessários no `app.config.ts`, alinhou as versões compatíveis do Expo SDK 54 e normalizou os ranges esperados do React Navigation. O lockfile foi regenerado e validado com `pnpm install --frozen-lockfile --offline`.

## Evidências executadas

| Validação                 | Resultado                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Expo Doctor               | `18/18 checks passed; No issues detected`                                                                           |
| Configuração pública Expo | `Pediu`, versão `1.0.0`, scheme `pediupediu`, bundle/package `space.manus.pediu.mobile`, 10 plugins nativos         |
| Regressões focadas        | 5 testes do preflight aprovados, incluindo bloqueio de `expo-asset` ausente                                         |
| Matriz local final        | 32 arquivos, 138 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados |
| Export web de produção    | Export concluído com 91 arquivos e 50 rotas estáticas                                                               |
| Deployment smoke final    | health 200, marketplace 200, CORS exato e métricas protegidas aprovados                                             |
| Stress final read-only    | 120 requests / 12 workers; p50 20,9 ms; p95 76,6 ms; máximo 153,9 ms; erro 0%                                       |

A etapa nativa estrutural está pronta para um build EAS, mas a sandbox não possui EAS CLI autenticado, Android SDK, `adb` ou dispositivos físicos. A Fase 7 continua aberta: não há evidência de instalação, permissões, localização, notificações, background, deep links ou checkout em Android/iOS reais. OAuth, push, storage externo, PSP/PIX, CNPJ, staging/produção definitivos e publicação nas lojas continuam pendentes; o Go-Live comercial permanece bloqueado.
