# Pediu Mobile — Levantamento Técnico e Norte de Implementação

> Documento de referência para todas as alterações futuras do projeto.
> Atualizado em 2026-09-18.

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
