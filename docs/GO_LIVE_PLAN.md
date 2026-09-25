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

| ID | Item | Critério de aceite | Status |
|---|---|---|---|
| P0-01 | Ambiente de staging | Ambiente isolado de produção, com variáveis próprias e banco próprio | ⬜ |
| P0-02 | Ambiente de produção | API/app/backend publicados com HTTPS e configuração segura | ⬜ |
| P0-03 | Banco de produção | Banco provisionado, migrations executadas e acesso restrito | ⬜ |
| P0-04 | Backup | Backup automático configurado e restore testado | ⬜ |
| P0-05 | Domínio/HTTPS | Domínio definitivo e certificados válidos | ⬜ |
| P0-06 | Secrets | Segredos fora do código e separados por ambiente | ⬜ |
| P0-07 | OAuth | Client IDs, redirect URIs, state/PKCE e domínio homologados | ⬜ |
| P0-08 | CORS | `ALLOWED_ORIGINS` configurado para os domínios reais | ⬜ |
| P0-09 | PIX | PSP escolhido, credenciais de produção e criação de cobrança homologadas | ⬜ |
| P0-10 | Webhook PIX | Assinatura, idempotência, atualização de pagamento e eventos de erro validados | ⬜ |
| P0-11 | E-mail | Provedor configurado e verificação de e-mail testada em produção controlada | ⬜ |
| P0-12 | Push | Push real validado em Android e iOS | ⬜ |
| P0-13 | Observabilidade | Logs, erros, latência e disponibilidade monitorados com alertas | ⬜ |
| P0-14 | E2E crítico | Jornada principal automatizada e verde | ⬜ |
| P0-15 | Dispositivos reais | Android/iOS testados com rede normal, ruim, permissões e background | ⬜ |

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

| Área | Go quando | No-Go quando |
|---|---|---|
| Segurança | P0 de segurança validado | Existe falha crítica aberta |
| Banco | Backup + restore testados | Não existe recuperação confiável |
| Pagamento | PSP homologado | Pagamento depende de operação manual não controlada |
| Webhook | Assinado + idempotente + testado | Eventos podem duplicar pedido/pagamento |
| OAuth | Fluxo real validado | Callback ou sessão não homologados |
| E-mail | Entrega real validada | Verificação/recuperação não funcionam |
| Push | Android/iOS validados | Notificações críticas falham |
| E2E | Jornada principal verde | Fluxo principal só foi testado manualmente |
| Dispositivos | Android/iOS reais aprovados | Só preview/web foi validado |
| Observabilidade | Alertas operacionais ativos | Falhas não são detectadas |
| Rollback | Procedimento testado | Não existe caminho de recuperação |
| Piloto | Sem incidentes críticos | Existem bloqueios operacionais |

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

| Etapa | Evidência automatizada |
|---|---|
| Catálogo | Produto fixture retornado pelo marketplace com loja e categoria corretas |
| Localização | Endereço persistido com latitude, longitude e seleção como padrão |
| Quote | Preço, taxa de entrega e total calculados pelo servidor |
| Checkout | Pedido criado usando endereço autorizado e total recalculado |
| Pagamento | PIX criado e mantido em `pending`; nenhum estado `paid` é fabricado |
| Idempotência | Repetição da mesma chave devolve o mesmo pedido/pagamento e mantém uma linha em cada tabela |
| Operação lojista | Pedido visível para o lojista e progressão `Pendente → Aceito → Preparando → Pronto` |
| Acompanhamento | Pedido final e eventos persistidos confirmados pelo cliente |

A execução local em banco limpo aplicou as 24 migrations versionadas e passou com a mensagem `Go-Live client E2E smoke passed`. O banco de preview híbrido anterior foi deliberadamente descartado como evidência: ele tinha tabelas antigas de anúncios, mas não possuía `users.themePreference`, demonstrando por que o smoke deve sempre começar de um schema limpo.

Este incremento cobre um smoke de API integrado, não substitui cadastro/login OAuth real, permissões nativas de localização, carrinho na UI, pagamento confirmado por PSP, webhook, rastreamento GPS, cancelamento, avaliação, push ou teste em Android/iOS. As caixas da jornada completa continuam pendentes até essas evidências serem produzidas.
