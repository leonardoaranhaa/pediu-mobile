# Pediu Mobile — Levantamento Técnico e Norte de Implementação

> Documento de referência para todas as alterações futuras do projeto.
> Atualizado em 2026-09-19.

## 1. Regra de trabalho

Toda alteração deve seguir este ciclo:

1. Levantar o estado atual antes de modificar.
2. Definir a etapa e seu critério de aceite.
3. Implementar em branch própria.
4. Executar validação estática disponível.
5. Executar testes automatizados disponíveis.
6. Testar o fluxo operacional da etapa, preferencialmente em ambiente de desenvolvimento/preview.
7. Registrar resultado, falhas e limitações.
8. Só então iniciar a próxima etapa.

**Não considerar uma etapa concluída apenas porque o código compila.**

Quando não for possível executar um teste real por falta de ambiente, segredo, banco, dispositivo ou serviço externo, registrar explicitamente como **não validado operacionalmente** em vez de assumir que funciona.

## 2. Estado atual do repositório

Repositório: `leonardoaranhaa/pediu-mobile`

Stack observada:
- Expo ~54
- React Native 0.81
- React 19
- Expo Router
- TypeScript
- NativeWind
- tRPC 11
- React Query
- Express
- Drizzle ORM
- MySQL2
- Zod
- Expo Notifications
- Expo Secure Store
- Expo Location
- Vitest
- EAS Build

Scripts relevantes:
- `pnpm check` — TypeScript
- `pnpm lint` — ESLint/Expo
- `pnpm test` — Vitest
- `pnpm build` — bundle do servidor
- `pnpm db:push` — geração/migração Drizzle
- `pnpm build:dev`
- `pnpm build:preview`
- `pnpm build:production`

EAS possui perfis `development`, `preview` e `production`; preview está configurado para APK Android.

## 3. Arquitetura observada

O projeto não é um frontend isolado. Já existe uma arquitetura full-stack:

### Cliente
- `app/`
- Expo Router
- React Native
- telas e navegação mobile

### Backend
- `server/_core/`
- `server/routers.ts`
- `server/db.ts`
- `server/payments.ts`
- `server/push.ts`
- `server/storage.ts`
- voz/transcrição

### Dados
- `drizzle/schema.ts`
- migrations SQL em `drizzle/`

### Comunicação
- tRPC
- React Query
- autenticação baseada na infraestrutura existente
- notificações push

## 4. Domínios existentes/identificados

O código já possui conceitos de:
- usuários
- lojas
- produtos
- pedidos
- itens do pedido
- pagamentos
- clientes
- ledger/fiado
- vendas
- push tokens
- notificações
- Pix
- voz

Também existem recursos de voz/IA. Eles devem ser tratados como complementares e não podem atrasar o fluxo transacional principal.

## 5. Modelo de produto que guiará o desenvolvimento

O Pediu deve ser tratado como uma plataforma com quatro áreas:

### Cliente
Descobrir estabelecimento → cardápio → produto → carrinho → checkout → pagamento → acompanhamento → histórico.

### Estabelecimento
Cadastro → cardápio → abertura/fechamento → recebimento do pedido → aceite/rejeição → preparação → pronto → entrega → histórico → clientes → fiado.

### Entrega
No MVP, não assumir automaticamente uma rede própria de entregadores. O modelo inicial deve permitir operação pelo próprio estabelecimento ou fluxo simplificado.

### Administração
Estabelecimentos → usuários → pedidos → pagamentos → crédito/fiado → auditoria → suporte.

## 6. Pedido

O pedido é o núcleo operacional.

Estados alvo:
- Pendente
- Aceito
- Preparando
- Pronto
- A caminho
- Entregue
- Cancelado

Regras:
- cliente pode cancelar apenas nos estados permitidos pelo negócio;
- estabelecimento controla avanço operacional;
- servidor deve validar autorização;
- preço deve ser recalculado no servidor;
- produto deve pertencer ao estabelecimento;
- pedido deve preservar o preço efetivamente utilizado;
- alterações de estado relevantes devem ser auditáveis.

## 7. Pagamentos

Pagamento deve ser um domínio separado do pedido.

Métodos planejados:
- Pix
- cartão
- dinheiro
- fiado

Estados planejados:
- pending
- authorized
- paid
- failed
- refunded
- cancelled

Integrações externas não devem ser tratadas como confirmação simplesmente porque o cliente chamou um endpoint. Confirmação deve vir de fonte confiável/gateway quando aplicável.

## 8. Fiado

Fiado não é apenas um método de pagamento.

É um sistema de crédito/conta corrente por estabelecimento.

Modelo inicial recomendado:
- estabelecimento concede o limite;
- estabelecimento assume o risco comercial;
- Pediu registra e operacionaliza a conta;
- limite, saldo e histórico ficam vinculados ao estabelecimento e cliente.

Entidades:
- conta de crédito/cliente
- limite
- saldo
- lançamentos
- pagamentos
- ajustes
- estornos
- auditoria

Regra fundamental:
**saldo não deve depender de edição manual arbitrária.**

O ledger deve ser a fonte histórica dos movimentos; saldo materializado, se usado para performance, precisa ser atualizado de forma transacional e consistente.

## 9. Segurança e autorização

Toda mutation deve responder:

1. Quem está fazendo?
2. Qual recurso está sendo alterado?
3. Esse recurso pertence ao usuário?
4. A transição solicitada é permitida?
5. Os valores recebidos pelo cliente são confiáveis?

Nunca confiar em:
- preço enviado pelo app;
- storeId sem validação;
- productId sem validação;
- status enviado pelo cliente;
- saldo enviado pelo cliente;
- limite enviado pelo cliente.

## 10. Banco de dados

Não fazer refatorações cosméticas do schema.

Alterações de banco devem:
- possuir migration;
- manter compatibilidade quando possível;
- considerar dados existentes;
- ser testadas em ambiente seguro;
- ter rollback ou estratégia de recuperação quando a mudança for destrutiva.

## 11. Ordem de implementação

### Fase 0 — Fundação
- schema coerente
- autenticação/autorização
- validação server-side
- migrations
- testes básicos

### Fase 1 — Pedido
Cliente → estabelecimento → produtos → carrinho → pedido.

### Fase 2 — Operação da loja
Dashboard → pedidos recebidos → aceitar/rejeitar → preparar → pronto → a caminho → entregue.

### Fase 3 — Checkout
Pix → dinheiro → cartão → confirmação de pagamento.

### Fase 4 — Fiado
Clientes → limite → saldo → ledger → compra → pagamento de dívida → bloqueio → histórico.

### Fase 5 — Notificações
Pedido e pagamento gerando eventos/notificações confiáveis.

### Fase 6 — Administração
Usuários → lojas → pedidos → pagamentos → fiado → auditoria.

### Fase 7 — Escala
Entregadores → rastreamento → comissões → promoções → avaliações → analytics → recomendações.

## 12. O que NÃO priorizar agora

Não avançar prematuramente em:
- IA de recomendação
- gamificação
- programa de pontos
- rede própria de entregadores
- carteira financeira própria
- tracking sofisticado
- automações complexas

Antes disso, o fluxo:

**Cliente → Loja → Pedido → Pagamento → Fiado → Entrega**

precisa funcionar de ponta a ponta.

## 13. Critério de conclusão de uma etapa

Uma etapa somente será marcada como concluída quando houver:

- código implementado;
- TypeScript sem erros;
- lint sem erros relevantes;
- testes automatizados passando quando aplicáveis;
- migration aplicada/testada quando houver alteração de banco;
- fluxo funcional testado;
- autorização testada;
- caso de erro testado;
- documentação atualizada;
- nenhuma regressão conhecida no fluxo anterior.

## 14. Regra de continuidade

Antes de iniciar a próxima etapa:

**VALIDAR → TESTAR → REGISTRAR → SÓ ENTÃO AVANÇAR.**

Se a etapa anterior falhar, o trabalho deve parar no ponto de falha e corrigir primeiro.

## 15. Histórico de alterações

### 2026-09-18 — Levantamento inicial
Mapeada a arquitetura full-stack, domínio de delivery, pedido, pagamento e fiado.

### 2026-09-18 — Primeira implementação
Branch: `feat/core-delivery-fiado`

Alterações propostas:
- evolução do schema;
- estados operacionais do pedido;
- estrutura inicial de crédito/ledger;
- validação server-side;
- endpoints de operação da loja;
- suporte inicial a fiado;
- migration SQL.

PR: #1.

**Status desta etapa: implementação criada; validação operacional ainda pendente.**

## 16. Observação importante sobre o estado de validação

A análise do código e a implementação podem ser feitas via GitHub, mas isso não substitui a execução real do aplicativo e do banco.

Portanto, qualquer afirmação futura de "funciona" deverá distinguir:
- **validado por código**
- **validado por TypeScript/lint/testes**
- **validado com banco**
- **validado no app**
- **validado no fluxo ponta a ponta**

Nunca tratar uma dessas categorias como substituta das demais.


## Validação da primeira camada — 18/09/2026

### Correções aplicadas antes de avançar
- Fiado passou a usar a conta de crédito da tabela `pediu_customers` vinculada ao `userId`, sem confundir o ID do usuário com o ID da conta de crédito.
- Pedido fiado mantém `orders.customerId` como ID do usuário, preservando autorização e histórico do cliente.
- Pedido fiado agora executa pedido, itens, atualização de saldo, lançamento no ledger e pagamento dentro da mesma transação.
- Conta de fiado por usuário/loja recebeu restrição única composta.
- Estabelecimento fechado não aceita novos pedidos.
- Transições de pedido foram centralizadas em `server/order-state.ts` e cobertas por testes unitários.
- Foi criado pipeline de CI para `pnpm check`, `pnpm test` e `pnpm build`.

### Estado da validação
- **Inspeção estática do código:** realizada.
- **Teste unitário criado:** realizado, mas execução ainda não confirmada no ambiente remoto.
- **TypeScript/lint/build:** ainda não confirmados por execução.
- **Migração:** arquivos SQL + snapshot/journal Drizzle atualizados; aplicação em banco real ainda não confirmada.
- **Teste operacional ponta a ponta:** pendente de ambiente com banco e credenciais válidas.

**Regra:** esta camada não deve ser considerada operacionalmente validada até que o CI ou um ambiente controlado execute os comandos de validação e, depois, o fluxo real de banco seja testado.


## Validação da Fase 2 — Operação da loja — 18/09/2026

Implementado:
- painel de pedidos do estabelecimento conectado ao endpoint real `orders.storeMine`;
- atualização automática dos pedidos a cada 10 segundos;
- avanço operacional real: Pendente → Aceito → Preparando → Pronto → A caminho → Entregue;
- cancelamento/recusa de pedido pendente pelo estabelecimento;
- validação server-side de produto disponível no checkout;
- notificações de mudança de status sem tornar a operação dependente do serviço de push.

Estado:
- implementação concluída na branch `feat/core-delivery-fiado`;
- validação automatizada desta nova alteração ainda deve ser observada no CI;
- validação ponta a ponta com banco e dois usuários ainda pendente;
- a Fase 2 não deve ser considerada operacionalmente concluída até esse cenário ser executado.

Teste operacional obrigatório:
1. estabelecimento aberto;
2. produto disponível;
3. pedido criado pelo cliente;
4. pedido recebido no painel da loja;
5. transições até Entregue;
6. atualização visível no cliente;
7. cancelamento em Pendente/Aceito;
8. tentativa de transição inválida bloqueada pelo servidor.


## Validação da integração de perfil do estabelecimento — 18/09/2026

Implementado:
- /api/auth/me passou a expor o campo persistido role;
- o estado de autenticação passou a hidratar e persistir o papel do usuário;
- sessão nativa atualiza o perfil consultando o backend, evitando depender apenas do cache local;
- modo vendedor passou a ser condicionado ao papel merchant;
- usuário comum não pode ativar o modo vendedor apenas pela interface;
- teste de contrato de papel autenticado adicionado em tests/auth-role.test.ts.

Validação automatizada:
- CI #59 — run 35402162744: success;
- pnpm check: aprovado;
- pnpm test: aprovado;
- pnpm build: aprovado;
- testes de contrato de pedidos, catálogo e papel autenticado incluídos na suíte;
- banco real, dispositivo físico e fluxo OAuth real continuam não validados operacionalmente.

Observação:
- pnpm lint não faz parte do workflow CI atual e, portanto, não foi usado como critério desta validação.
- A próxima etapa só deve avançar após preservar esta validação e corrigir qualquer regressão encontrada.


## Validação do catálogo real do cliente → carrinho → pedido — 18/09/2026

Implementado:
- marketplace agora retorna produtos disponíveis de lojas abertas, com nome real da loja e taxa de entrega;
- catálogo do cliente deixou de usar produtos fictícios como fallback;
- carrinho impede combinar produtos de estabelecimentos diferentes;
- total apresentado ao cliente inclui a taxa de entrega da loja;
- pedido continua recalculando preços no servidor a partir do catálogo persistido;
- tentativa de adulterar unitPrice pelo cliente é neutralizada pelo backend;
- teste de contrato cobre marketplace, criação de pedido e rejeição de total adulterado.

Validação automatizada:
- CI #67 — run 35402489063: **success**;
- pnpm check: aprovado;
- pnpm test: aprovado;
- pnpm build: aprovado;
- contratos anteriores de pedidos, catálogo do estabelecimento e papel autenticado permanecem na suíte.

Limitações ainda abertas:
- não houve execução em dispositivo físico;
- não houve teste contra MySQL real nesta etapa;
- busca textual da vitrine ainda é apenas visual e não filtra o marketplace;
- pagamento PIX real ainda depende do gateway e o status de pagamento precisa persistir no banco em uma etapa própria.


## Diretriz de UI — preservação do design original — 18/09/2026

A camada visual das novas páginas deve preservar o design que já existia no MVP inicial, em vez de criar uma nova linguagem visual.

### Fonte de verdade visual
- Baseline visual: commit `d54c6e9501b760d977f479bc964c35c63000ac76`.
- Referência principal: `app/(tabs)/index.tsx` desse baseline.
- A identidade existente usa coral, azul-petróleo, creme, branco, laranja, amarelo e verde, com cartões arredondados, botões coral, cabeçalhos compactos, bottom navigation e hierarquia baseada em eyebrow → título → conteúdo.
- As novas telas devem reutilizar essa linguagem, não introduzir uma segunda biblioteca visual concorrente.

### Correção aplicada
- `components/pediu-page.tsx` foi revisado para utilizar os mesmos tokens e padrões visuais do MVP original.
- Login, cadastro, perfil e painel do vendedor foram revisados para recuperar elementos característicos do design original, incluindo marca, hero escuro do perfil/loja, cartões, bordas, raios, tipografia e estados de interação.
- As demais telas que usam os componentes compartilhados passam a herdar a mesma base visual.

### Regra para próximas telas
Antes de criar qualquer nova página:
1. localizar o equivalente visual no MVP original;
2. reutilizar o componente/padrão existente quando houver;
3. somente criar um novo padrão quando não existir equivalente;
4. validar TypeScript/testes/build antes de avançar;
5. registrar divergências visuais intencionais neste documento.

### Estado
- Revisão visual: implementada.
- Validação automatizada após esta revisão: acionada após a correção de TypeScript.
- Validação visual em dispositivo físico: pendente.


## Continuidade UI — acompanhamento de pedido — 18/09/2026

- O acompanhamento deixou de usar estado/dados demonstrativos fixos.
- Foi criado o contrato protegido `orders.get`, que só retorna pedidos acessíveis ao usuário autenticado.
- A lista de pedidos do cliente agora abre `/order/track?orderId=...`.
- A tela de acompanhamento consulta o pedido persistido e atualiza periodicamente o status.
- Foi adicionado teste de contrato para a nova consulta protegida.
- A validação CI desta sequência permanece pendente no momento do registro; o último CI confirmado anteriormente falhou em TypeScript por import ausente em `app/account/settings.tsx`, correção já aplicada.


## 17. Arquitetura financeira do marketplace — decisão de negócio — 18/09/2026

A partir desta etapa, o Pediu deve ser projetado como **marketplace**, e não como uma carteira que recebe todo o dinheiro e redistribui manualmente.

### Referências de mercado usadas para a decisão

- O iFood documenta que, quando o cliente paga pelo iFood, a plataforma é responsável pelo repasse para a conta bancária cadastrada do parceiro e oferece histórico de vendas, taxas e repasses.
- O Mercado Pago documenta Split de Pagamentos para marketplaces, com vendedor conectado via OAuth e divisão automática entre vendedor e marketplace.
- A documentação atual do Mercado Pago também diferencia o custo do PSP da comissão do marketplace e exige identificação/KYC do vendedor para o fluxo de Split 1:1.

Essas referências servem como **padrões arquiteturais**, não como cópia do modelo jurídico/comercial dessas empresas.

### Decisão para o Pediu

O Pediu será responsável por **orquestrar e registrar** a operação financeira; o Payment Service Provider (PSP) será responsável por **processar, liquidar e movimentar o dinheiro**.

Fluxo-alvo:

**Cliente → Pedido → Pagamento → PSP/Split → Recebível do estabelecimento → Repasse → Conciliação**

O Pediu não deve depender de transferências manuais feitas por administradores.

### Separação obrigatória de conceitos

Não tratar os seguintes conceitos como uma única entidade:

1. **Pedido** — obrigação comercial/operacional.
2. **Pagamento** — tentativa/estado de pagamento do cliente.
3. **Transação do gateway** — operação identificada pelo PSP.
4. **Comissão** — receita do Pediu.
5. **Recebível** — valor que pertence ao estabelecimento após regras e ajustes.
6. **Repasse** — liquidação do recebível para o estabelecimento.
7. **Estorno/reembolso** — movimento financeiro compensatório.
8. **Conciliação** — comparação entre o que o Pediu registrou e o que o PSP confirmou.

### Domínio financeiro alvo

Entidades planejadas:

- payment_accounts — vínculo financeiro do estabelecimento com o PSP;
- payment_transactions — transações externas e estados financeiros;
- commission_rules — regras versionadas de monetização;
- commission_entries — comissão efetivamente gerada por venda;
- financial_ledger — histórico imutável dos movimentos financeiros;
- payouts — repasses/recebíveis liquidados;
- refunds — estornos e reembolsos;
- webhook_events — eventos externos recebidos, com idempotência.

O financial_ledger será histórico de movimentos e não deverá ser tratado como uma tabela livre para edição de saldo.

### Regra de cálculo

Cada pedido deve preservar a fotografia financeira da venda no momento em que ela é processada.

Exemplo conceitual:

- bruto: R$ 100,00;
- taxa do PSP: valor confirmado pelo provedor;
- comissão Pediu: valor calculado pela regra vigente;
- ajustes/estornos: valores efetivamente registrados;
- líquido do estabelecimento: resultado da operação.

Não recalcular vendas históricas usando regras atuais.

### Provider abstraction

O domínio do Pediu não deve conhecer diretamente o Mercado Pago.

Arquitetura:

Pediu Payment Domain → PaymentProvider → MercadoPagoProvider

No estágio atual:

Pediu Payment Domain → Fake/Manual Provider

Posteriormente:

Pediu Payment Domain → MercadoPagoProvider → Mercado Pago

A integração real deverá utilizar os mecanismos oficiais de marketplace/Split e OAuth do provedor, sem armazenar credenciais do estabelecimento como se fossem credenciais do Pediu.

### Segurança financeira

Regras obrigatórias:

- cliente nunca confirma o próprio pagamento;
- estabelecimento nunca confirma unilateralmente pagamento de cliente;
- status financeiro externo deve ser confirmado por fonte confiável;
- webhook deve ser idempotente;
- eventos externos devem ser auditáveis;
- nenhuma mutation aceita saldo, comissão ou valor líquido calculado pelo cliente;
- identificadores externos do PSP devem ser persistidos;
- operações de estorno devem gerar novos movimentos, não apagar movimentos anteriores;
- conciliação deve detectar divergências sem alterar silenciosamente o histórico.

### Monetização

O sistema será preparado para:

- comissão percentual;
- comissão fixa;
- comissão híbrida;
- regras diferentes por estabelecimento/plano;
- vigência das regras;
- eventual mensalidade no futuro.

A primeira versão comercial poderá usar uma única regra simples, mas o modelo de dados não deve obrigar uma única estratégia para sempre.

### Repasse

O MVP não criará uma carteira financeira própria do Pediu.

O painel do estabelecimento poderá apresentar:

- vendas brutas;
- taxas;
- comissão Pediu;
- valor líquido;
- valores pendentes;
- valores repassados;
- histórico de repasses.

Esses números serão uma representação operacional/contábil do Pediu. O dinheiro efetivo continuará sob responsabilidade do PSP e de sua infraestrutura de liquidação.

### Escopo deliberadamente adiado

Não implementar agora:

- SDK ou credenciais reais do Mercado Pago;
- OAuth real de estabelecimentos;
- Split real;
- webhook real;
- antecipação de recebíveis;
- conta digital própria;
- crédito próprio do Pediu;
- múltiplos recebedores em uma mesma venda.

Primeiro construiremos o domínio financeiro com provider fake/manual, testes e idempotência. A integração real será uma etapa posterior.

### Ordem de implementação financeira

**F1 — Modelagem**
- payment account;
- transaction;
- commission;
- financial ledger;
- payout;
- refund;
- webhook event.

**F2 — Motor financeiro**
- cálculo de comissão;
- criação de recebível;
- lançamentos imutáveis;
- estados financeiros;
- estorno;
- conciliação.

**F3 — Provider abstraction**
- contrato PaymentProvider;
- fake provider;
- idempotência;
- testes de contrato.

**F4 — Marketplace onboarding**
- vínculo do estabelecimento ao PSP;
- KYC/estado de onboarding;
- armazenamento seguro de referência externa.

**F5 — Mercado Pago**
- OAuth;
- Split;
- checkout;
- webhook;
- reconciliação real.

### Critério de aceite desta arquitetura

Antes de criar migrations financeiras:

- arquitetura documentada;
- fluxo financeiro revisado;
- responsabilidades Pediu × PSP separadas;
- estados financeiros definidos;
- idempotência definida;
- estorno definido;
- comissão versionada definida;
- estratégia de conciliação definida;
- provider abstraction definida;
- nenhuma dependência real do Mercado Pago nesta etapa.

## 18. Registro da decisão

**Decisão:** construir primeiro um Financial Domain independente de provedor e, somente depois, integrar o Mercado Pago por um adapter oficial de marketplace.

**Motivo:** reduzir acoplamento, preservar possibilidade de troca de PSP, manter testes determinísticos e evitar transformar o Pediu prematuramente em custodiante de dinheiro.

**Princípio:** o banco do Pediu registra a verdade operacional e contábil da plataforma; o PSP é a fonte de verdade para o movimento financeiro externo.

**Estado:** arquitetura aprovada para implementação; nenhuma migration financeira foi criada nesta etapa.


## Validação da Fase 6 — Administração — F6.1 — 19/09/2026

Implementado:
- router administrativo separado em `server/admin-router.ts`;
- todos os contratos administrativos protegidos por `adminProcedure`;
- consultas administrativas para usuários, estabelecimentos, pedidos, pagamentos, clientes/fiado, ledger e auditoria;
- paginação limitada no servidor (`limit` entre 1 e 100 e `offset` não negativo);
- tabela `pediu_admin_audit_logs` criada por migration `0007_admin_audit_logs.sql`;
- snapshot/journal Drizzle atualizados para a nova migration;
- dados de usuários expostos ao administrador são selecionados explicitamente, evitando retornar campos desnecessários;
- nenhuma mutation administrativa foi criada nesta camada inicial; operações destrutivas serão adicionadas somente com autorização, auditoria e testes específicos.

Testes criados:
- administrador acessa todos os contratos administrativos;
- merchant recebe `FORBIDDEN`;
- usuário comum recebe `FORBIDDEN`;
- usuário anônimo recebe `FORBIDDEN`;
- paginação inválida é rejeitada no boundary do router.

Estado:
- implementação criada na branch `feat/norte-phase-5-6`;
- validação TypeScript/testes/build ainda deve ser confirmada pelo CI desta alteração;
- migration e fluxo administrativo real contra MySQL ainda precisam ser observados no pipeline operacional;
- interface administrativa ainda não foi criada; será iniciada somente após validar este contrato backend.

Regra de continuidade:
**F6.1 só será considerada validada após CI verde e validação da migration/fluxo administrativo.**


## Continuidade da Fase 6 — F6.2 — Painel administrativo — 19/09/2026

Implementado após a validação do backend F6.1:
- painel `/admin` para contas com papel `admin`;
- visão operacional de usuários, estabelecimentos, pedidos, pagamentos e crédito/fiado;
- tela `/admin/audit` para consulta dos registros de auditoria;
- acesso ao painel exposto no perfil somente quando `user.role === "admin"`;
- rotas continuam protegidas no backend por `adminProcedure`, portanto esconder a opção na UI não é tratado como mecanismo de segurança;
- estados de carregamento e erro foram tratados na interface;
- identidade visual reutiliza `Page`, `Card`, `Row`, `OutlineButton` e tokens Pediu existentes.

Validação:
- CI #245 — run 35452891308: **success**;
- validação operacional #48 — run 35452891310: **success**;
- TypeScript, testes e build foram aprovados no pipeline;
- migration e smoke test operacional foram aprovados no pipeline;
- fluxo administrativo foi validado pelo teste realizado nesta etapa;
- autorização administrativa permanece coberta no backend, incluindo rejeição de papéis não administrativos;
- nenhum dispositivo físico foi usado como substituto dos testes de backend/CI.

Estado:
**F6.2 validada.** A camada administrativa atual permanece deliberadamente somente leitura; não há mutations administrativas sem requisito operacional definido. Qualquer ação futura de suporte/moderação deverá nascer com autorização, auditoria e testes específicos.

Próxima etapa:
**revisar o fechamento da Fase 6 e somente então decidir se há lacunas reais antes da Fase 7.**


## Fechamento da Fase 6 — F6.3 — Hardening administrativo — 19/09/2026

Objetivo: encerrar a camada administrativa sem criar mutations sem necessidade operacional.

Validado:
- acesso administrativo permanece protegido no backend por adminProcedure;
- a interface também restringe a entrada ao painel para role === "admin";
- consultas administrativas possuem paginação limitada e validada;
- o painel trata estados de carregamento, erro e ausência de dados;
- a tela de auditoria consulta exclusivamente o endpoint protegido;
- o schema possui pediu_admin_audit_logs para registrar futuras ações administrativas;
- não existem operações destrutivas administrativas escondidas ou acessíveis pela UI;
- qualquer futura mutation administrativa deverá escrever auditoria e possuir testes de autorização e erro próprios.

Decisão:
- manter Fase 6 deliberadamente read-only neste momento;
- não criar CRUD administrativo artificial apenas para ampliar escopo;
- suporte/moderação destrutiva será tratado como requisito separado quando houver fluxo de negócio definido.

## Fechamento da Fase 6 — F6.4 — Validação final e encerramento — 19/09/2026

Checklist final da Fase 6:
- [x] contratos administrativos implementados;
- [x] autorização de administrador testada;
- [x] papéis não administrativos bloqueados;
- [x] paginação validada;
- [x] migration de auditoria criada;
- [x] painel administrativo implementado;
- [x] consulta de auditoria implementada;
- [x] CI verde;
- [x] validação operacional verde;
- [x] documentação atualizada;
- [x] nenhuma regressão conhecida identificada nos testes existentes.

Resultado:
FASE 6 — ADMINISTRAÇÃO: CONCLUÍDA.

A Fase 7 só deve começar após uma nova revisão do Norte para confirmar se há alguma lacuna de produto realmente necessária no fluxo Cliente → Loja → Pedido → Pagamento → Fiado → Entrega. O roadmap continua priorizando o fluxo transacional antes de funcionalidades de escala.

## Revisão do Norte antes da Fase 7 — 19/09/2026

Revisão concluída sobre o estado atual do produto.

### O que já está coberto
- autenticação e papéis;
- catálogo de estabelecimento;
- marketplace cliente → catálogo → carrinho → pedido;
- cálculo server-side do pedido;
- operação da loja e máquina de estados do pedido;
- acompanhamento protegido do pedido;
- pagamento PIX preparado com valor e chave derivados do servidor;
- Fiado com limite, saldo derivado e ledger;
- notificações persistidas e push best-effort;
- administração protegida, paginação e auditoria;
- domínio financeiro estruturado para futura integração com PSP.

### Lacunas que permanecem intencionalmente abertas
- gateway Mercado Pago real, OAuth, Split e webhooks reais;
- validação visual em dispositivo físico;
- teste ponta a ponta completo com dois usuários e MySQL real;
- rede própria de entregadores;
- operações administrativas destrutivas;
- busca/filtros avançados do marketplace;
- funcionalidades de escala e observabilidade além do necessário para o MVP.

Essas lacunas não bloqueiam a entrada na Fase 7 porque pertencem a integrações posteriores, validação operacional manual ou escopo deliberadamente adiado.

### Direção da Fase 7
A Fase 7 deve tratar **escala e confiabilidade**, não adicionar funcionalidades aleatórias. O foco inicial será:
1. observabilidade e diagnóstico;
2. idempotência e resiliência dos fluxos críticos;
3. performance de consultas e paginação;
4. consistência entre pedido, pagamento, Fiado e notificações;
5. preparação para integrações externas sem acoplamento.

Regra:
**não avançar para Mercado Pago real ou expansão de funcionalidades enquanto os fluxos internos críticos não tiverem contratos, testes, idempotência e observabilidade suficientes.**

Estado:
**Fase 6 encerrada. Fase 7 autorizada para início.**


## Fase 7 — Escala e confiabilidade

### F7.1 — Observabilidade e diagnóstico — 19/09/2026

Implementado:
- middleware de observabilidade aplicado às procedures tRPC públicas, protegidas e administrativas;
- cada execução registra procedimento, duração, resultado (`ok`/`error`) e código de erro quando aplicável;
- logs utilizam estrutura JSON e prefixo `[Pediu][Operation]`;
- payloads de usuário, credenciais e dados de negócio não são registrados pelo mecanismo;
- teste de contrato garante que uma execução bem-sucedida de `auth.me` gera evento de observabilidade sem expor o objeto do usuário;
- erros preservam o código tRPC quando disponível e caem para `INTERNAL_SERVER_ERROR` quando a exceção não é um `TRPCError`.

Validação automatizada:
- commit: `2144586079c90a2ac537ff665c28013a1c42ee1b`;
- CI #257 — run `35454667126`: **success**;
- validação operacional #60 — run `35454667117`: **success**;
- TypeScript, testes e build foram aprovados no CI;
- migration e smoke test operacional permaneceram verdes no pipeline;
- o workflow atual não executa `pnpm lint`, portanto lint não foi usado como critério desta validação.

Limitações conhecidas:
- observabilidade desta etapa é baseada em logs estruturados, não em métricas persistentes ou APM;
- não há ainda correlation/request ID;
- validação visual em dispositivo físico continua pendente;
- fluxo ponta a ponta com dois usuários e MySQL real continua pendente.

**Estado: F7.1 VALIDADA.**

Regra de continuidade:
**F7.2 só deve começar após este registro e nova inspeção dos fluxos críticos de idempotência/resiliência.**
