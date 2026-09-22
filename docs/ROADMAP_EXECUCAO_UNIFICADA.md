# Pediu — Roadmap de execução unificada

## Decisão de execução

As etapas restantes do mapa vertical serão executadas em uma única frente sobre o pull request aberto `feat/core-marketplace-flow`. A frente seguirá conexões verticais completas em vez de criar telas isoladas. Cada bloco deverá atravessar interface, estado local ou global, tRPC, backend, banco ou serviço externo e retorno visual.

As entregas já publicadas não serão reabertas sem necessidade. O estado inicial desta frente inclui autenticação com estado de visitante controlado, catálogo, loja, produto, carrinho persistente, endereços, cotação server-side, cupons server-side, idempotência, pedido transacional, PIX, tracking básico, chat persistente, notificações, avaliações autorizadas e CI operacional.

## Ordem consolidada

A primeira camada fecha as dependências de acesso e contexto: sessão, expiração, logout, localização, endereço e área de entrega. A segunda camada completa descoberta e loja: busca, filtros, paginação, distância, avaliação, disponibilidade e informações operacionais. A terceira camada completa compra: adicionais, observações, carrinho sincronizado, cotação, pagamento, confirmação, cancelamento e recuperação após falha.

A quarta camada implementa a operação pós-compra: máquina de estados, eventos de entrega, posição atual, ETA, tracking, entregador e realtime. A quinta camada fecha comunicação e confiança: chat, notificações, suporte, avaliação, respostas da loja e histórico. A sexta camada completa perfil, pagamentos, privacidade e LGPD. A sétima camada aplica UX, acessibilidade, performance e segurança transversalmente. A última camada executa E2E, CI/CD, auditoria e preparação de release.

## Critérios transversais

Nenhum valor financeiro será confiado ao cliente. Toda leitura protegida verificará o usuário da sessão e a propriedade do recurso. Toda operação repetível deverá possuir idempotência quando produzir pedido, pagamento, mensagem ou evento. Cada nova migration deverá aplicar em banco MySQL vazio. Cada bloco deverá possuir testes de contrato e pelo menos um fluxo operacional verificável.

Estados de carregamento, vazio, erro e retry deverão ser explícitos nas telas novas. Dados de cartão serão representados apenas por tokens ou referências do provedor. Logs não deverão registrar tokens, payloads sensíveis ou dados completos de pagamento.

## Estado inicial e entregas pendentes

| Bloco | Estado inicial | Próximo resultado verificável |
|---|---|---|
| Autenticação e localização | Parcial | Sessão expirada, logout, endereço e validação de área |
| Descoberta e loja | Parcial | Busca com filtros, paginação e dados operacionais |
| Compra | Núcleo implementado | Adicionais, observações, estoque, carrinho sincronizado e recuperação |
| Pedido e tracking | Base implementada | Timeline por eventos, transições e acompanhamento operacional |
| Entregador | Pendente | Posição, ETA, identificação e encerramento |
| Chat e notificações | Base persistida | Realtime, leitura, preferências e deep links |
| Pagamentos e avaliações | Backend parcial | Métodos seguros, estados completos e envio de avaliações |
| Perfil e LGPD | Base de telas | Dados, consentimentos, exportação e exclusão |
| Qualidade transversal | Parcial | Acessibilidade, performance, segurança e observabilidade |
| Testes e release | CI básico verde | E2E completo, auditoria e release candidate |

## Validação final

A frente só será considerada concluída após `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, migrations em banco vazio, smoke test da API, E2E web e confirmação dos workflows do GitHub. Limitações causadas por OAuth externo, provedor de pagamentos ou dispositivo nativo serão registradas com reprodução e não serão declaradas como aprovadas sem evidência.

## Referências

[1]: ./IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ./FASE_G11_PRODUTO_CARRINHO.md "Fase G11 de produto e carrinho global"
[3]: ./FASE_G12_COTACAO_CARRINHO_COMPLETO.md "Fase G12 de cotação server-side e carrinho"
[4]: ./FASE_G13_CUPOM_CHECKOUT_CONFIRMACAO.md "Fase G13 de cupom, checkout e confirmação"
[5]: ./FASE_ENDERECOS_CHECKOUT_INTEGRACAO.md "Fase de endereços e checkout server-side"

## Atualização de execução — 2026-09-21

Na mesma frente do PR foram implementados busca server-side com categoria, texto, preço e paginação; observações de item persistidas da interface ao pedido; eventos de tracking registrados na criação, cancelamento e transição de status; timeline de entrega com atualização periódica; avaliação de estabelecimento, produto e entregador; chat com polling, erro e retry; tickets persistentes de suporte; e consentimentos persistentes de termos e privacidade.

As migrations `0014_support_tickets.sql`, `0015_order_item_notes.sql` e `0016_privacy_consents.sql` foram geradas no journal do Drizzle. O conjunto local continua passando typecheck e testes, com 62 testes aprovados e 1 ignorado. A aplicação das migrations 0000–0015 já foi verificada em banco vazio; a migration 0016 será incluída na validação final antes do push.

A home também foi alinhada ao checkout dedicado: a entrada de finalização deixou de abrir o modal legado e redireciona para `/checkout`, garantindo que cotação, cupom, observações, idempotência e confirmação usem o mesmo contrato server-side.

## Atualização de execução — 2026-09-22

O bloco de entregador foi implementado sobre o PR aberto. A fase adicionou atribuição única por pedido, posição histórica com idempotência, ETA, operador autorizado, transição automática para `A caminho`, encerramento para `Entregue` e notificações transacionais. A loja recebeu uma tela operacional de entregas. O cliente recebeu a visualização de entregador e última posição com polling.

A validação local confirmou 67 testes aprovados e 1 ignorado, além de typecheck, build e lint sem erros. As 18 migrations foram aplicadas em banco MySQL vazio. O smoke visual no Expo Web confirmou os estados vazio, aguardando atribuição e aguardando posição sem falhas de renderização.

## Atualização de execução — 2026-09-22

A frente de comunicação foi concluída. O chat agora possui participantes autorizados da loja e do cliente, leitura, polling e idempotência. A central de notificações possui preferências persistentes e deep links internos. O serviço de push passou a respeitar preferências sem perder o histórico interno.

A validação confirmou 71 testes aprovados e 1 ignorado, typecheck, build, lint e 19 migrations aplicadas em banco vazio. O smoke web confirmou o estado de visitante da central e o bloqueio privado do chat.

## Atualização de execução — 2026-09-22

A frente de conta real foi concluída. O usuário pode editar nome e e-mail, persistir preferências de pagamento, consultar exportação estruturada e abrir uma solicitação de exclusão assistida. A interface não armazena dados de cartão e mantém o papel e o identificador de login protegidos.

A validação confirmou 75 testes aprovados e 1 ignorado, typecheck, build, lint e 20 migrations aplicadas em banco vazio. O smoke web confirmou os estados de visitante das telas de dados pessoais, pagamentos e privacidade.

## Atualização de execução — 2026-09-22

A frente de avaliações pós-entrega foi concluída. Reviews agora exigem pedido entregue e propriedade do cliente, possuem chave de idempotência por alvo e podem ser repetidas com segurança após falhas parciais. O formulário de feedback foi protegido para visitantes e mantém a separação entre avaliação e suporte.

A validação confirmou 79 testes aprovados e 1 ignorado, typecheck, build, lint e 21 migrations aplicadas em banco vazio. O smoke web confirmou o bloqueio do formulário para visitantes.

## Atualização de execução — 2026-09-22

A frente de mensagens de suporte foi concluída. Chamados agora possuem conversa persistente, leitura, polling, autorização do proprietário ou administrador e idempotência de envio. Respostas administrativas geram notificação interna ao cliente sem misturar o fluxo com o chat do pedido.

A validação confirmou 83 testes aprovados e 1 ignorado, typecheck, build, lint e 22 migrations aplicadas em banco vazio. O smoke web confirmou o bloqueio de suporte para visitantes.

## Atualização de execução — 2026-09-22

O suporte ganhou um painel administrativo protegido para listar chamados, responder clientes e alterar status. Cada transição de status é registrada na auditoria, enquanto usuários não administrativos permanecem bloqueados.

## Atualização de execução — 2026-09-22

A auditoria da etapa de MFA e recuperação confirmou que o repositório usa um provedor OAuth externo, mas o ambiente atual não possui `EXPO_PUBLIC_OAUTH_PORTAL_URL`, `EXPO_PUBLIC_OAUTH_SERVER_URL` ou `EXPO_PUBLIC_APP_ID`. Não foi inventado um fluxo OTP local. Login e cadastro agora exibem estado explícito de indisponibilidade no preview, em vez de aparentar funcionamento ou construir URL inválida.

A integração real de MFA, recuperação de senha e recuperação de conta permanece **não implementada e bloqueada por configuração/contrato do provedor externo**. O próximo passo para concluí-la é disponibilizar o provedor autorizado, seus endpoints de recuperação/MFA, URLs de callback e variáveis públicas/seguras correspondentes.
