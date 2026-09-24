# Pediu Mobile

Aplicativo de delivery local construído com Expo, React Native, Expo Router e um backend Express com tRPC. O projeto atende os papéis de cliente, lojista e entregador em uma experiência compartilhada. O fluxo principal cobre descoberta de produtos, carrinho, cotação server-side, checkout com PIX ou dinheiro, pedidos idempotentes, acompanhamento, chat, suporte, avaliações, fiado, notificações e personalização por tema.

> **Estado atual:** a base de delivery e as correções da auditoria estão integradas em `main`. Esta frente incremental usa uma branch `feat/**`, preserva a separação por pull request e passa pelo CI antes de ser incorporada.

## Stack

- **Cliente:** Expo SDK 54, React Native, Expo Router, NativeWind e React Native Web.
- **Servidor:** Node.js, Express, tRPC v11 e TypeScript.
- **Persistência:** MariaDB/MySQL com Drizzle ORM e migrations versionadas.
- **Autenticação:** OAuth com sessão HttpOnly no web e token armazenado no SecureStore em dispositivos nativos.
- **Qualidade:** Vitest, TypeScript, ESLint, esbuild e GitHub Actions.

## Fluxos disponíveis

O cliente pode pesquisar o marketplace, filtrar categorias, consultar produtos, montar o carrinho e enviar pedidos com chave de idempotência. O total do pedido é recalculado no servidor a partir do catálogo persistido. Endereços podem ser cadastrados com coordenadas, e a localização do dispositivo pode ser geocodificada e salva como endereço padrão.

O lojista pode criar a primeira loja por meio do onboarding, publicar produtos, acompanhar pedidos, registrar vendas, consultar clientes e fiado, gerenciar entregas e alternar entre os temas do aplicativo. A criação da loja promove a conta para `merchant` na mesma transação que persiste o estabelecimento.

O **Estúdio de anúncios** transforma um produto real do catálogo em um criativo revisável: a IA sugere headline, descrição, CTA e direção visual, e a infraestrutura interna gera a imagem promocional. O lojista escolhe o tom e informa apenas vantagens que realmente pretende cumprir; o anúncio só entra no marketplace depois da publicação explícita. A home do cliente prioriza criativos publicados e oferece a área **Pediu Vantagens**, com cupons ativos validados no servidor e aplicáveis ao checkout.

O acompanhamento de entregas possui atribuição, localização, ETA, eventos operacionais e transições condicionais. Chat, notificações, suporte, avaliações, privacidade e exportação de dados são protegidos por autenticação e autorização no backend.

## Requisitos locais

- Node.js 20 ou superior.
- pnpm 9.12.0, conforme `package.json`.
- MariaDB ou MySQL para executar o backend com persistência.
- Um provedor OAuth configurado para testar login real.

Instale as dependências com:

```bash
pnpm install
```

## Configuração de ambiente

O servidor lê variáveis do ambiente. Em `NODE_ENV=production`, a inicialização rejeita a execução quando `VITE_APP_ID`, `JWT_SECRET`, `DATABASE_URL` ou `ALLOWED_ORIGINS` estiverem ausentes.

Exemplo mínimo para desenvolvimento:

```bash
export NODE_ENV=development
export DATABASE_URL='mysql://usuario:senha@127.0.0.1:3306/pediu'
export VITE_APP_ID='app-id-do-ambiente'
export JWT_SECRET='segredo-local-apenas-para-desenvolvimento'
export ALLOWED_ORIGINS='http://localhost:8081'
```

Para habilitar autenticação e integrações, configure também, conforme o recurso usado:

- `OAUTH_SERVER_URL`, `EXPO_PUBLIC_OAUTH_PORTAL_URL`, `EXPO_PUBLIC_OAUTH_SERVER_URL`, `EXPO_PUBLIC_APP_ID` e, quando necessário, `EXPO_PUBLIC_API_BASE_URL`.
- `OWNER_OPEN_ID` para o usuário proprietário do ambiente.
- `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY` para os recursos de dados, LLM, storage, transcrição e notificações oferecidos pelo ambiente.
- `PIX_PROVIDER`, `PIX_API_URL` e `PIX_API_KEY` para um provedor PIX real.
- `PAYMENT_WEBHOOK_SECRET` para validar o HMAC do endpoint `POST /api/webhooks/payments`.
- `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_SECRET` e `EMAIL_VERIFICATION_BASE_URL` para o envio de links de verificação de e-mail.
- `COOKIE_DOMAIN` quando o cookie web precisar de um domínio explícito.

Variáveis com prefixo `EXPO_PUBLIC_` são incorporadas ao cliente. Não coloque segredos, tokens privados ou chaves de gateway nessas variáveis.

## Banco de dados e migrations

As migrations comprometidas estão em `drizzle/`. Para aplicar somente o histórico já versionado em um banco existente, use:

```bash
DATABASE_URL='mysql://usuario:senha@127.0.0.1:3306/pediu' pnpm exec drizzle-kit migrate
```

O comando `pnpm db:push` executa a geração de migration e a aplicação. Use-o apenas quando uma alteração intencional de schema tiver sido revisada, pois ele pode criar novos arquivos no histórico. O CI aplica as migrations comprometidas em um banco MySQL limpo e verifica as tabelas essenciais.

As migrations atuais incluem o domínio de marketplace, pedidos e pagamentos, comunicação, entregas, suporte, preferências de conta, tema por usuário, tokens de verificação de e-mail, chaves estrangeiras dos domínios centrais e créditos/anúncios gerados por IA (`0024_ai_ads.sql`).

## Desenvolvimento

Para iniciar o servidor e o Expo web em paralelo:

```bash
pnpm dev
```

Para iniciar cada parte separadamente:

```bash
pnpm dev:server
pnpm dev:metro
```

O backend expõe a verificação de saúde em `GET /api/health`. O Expo web normalmente usa a porta `8081`, enquanto o servidor usa a porta `3000` quando `PORT` não é sobrescrita.

## Validação

Execute a matriz local antes de enviar alterações:

```bash
pnpm check
pnpm test
pnpm build
pnpm lint
git diff --check
```

Os testes cobrem contratos de autenticação e papel, marketplace, carrinho, checkout, pagamentos, cupons, pedidos, entrega, notificações, suporte, segurança, webhook assinado e verificação de e-mail. O fluxo E2E com dispositivo físico ainda depende de credenciais OAuth, permissões nativas e um ambiente de integração.

## Estrutura do repositório

| Diretório | Responsabilidade |
|---|---|
| `app/` | Rotas Expo Router, telas de cliente, conta, lojista, entrega e suporte |
| `components/` | Componentes visuais, layout e controles compartilhados |
| `providers/` | Estado global do carrinho |
| `hooks/` | Hooks de autenticação e comportamento de interface |
| `lib/` | Preferências, localização, API, sessão e utilitários do cliente |
| `server/` | Express, tRPC, autorização, domínio, persistência e integrações |
| `drizzle/` | Schema, relações, migrations e journal do banco |
| `tests/` | Testes Vitest de contratos e boundaries HTTP |
| `docs/` | Arquitetura, máquinas de estado, roadmap, auditoria e validações |
| `.github/workflows/` | CI e validação operacional com MySQL e API |

## Segurança e operação

O servidor restringe CORS a origens configuradas e rejeita mutations baseadas em cookie quando a origem não é permitida. Sessões web usam cookies `HttpOnly` e `SameSite=Lax`; clientes nativos usam Bearer token. O callback OAuth não aceita token de sessão na URL e os logs não registram codes, state, cookies, tokens ou headers sensíveis.

A interpretação de voz e a transcrição possuem limites de taxa, timeout, concorrência e tamanho. O proxy de storage exige autenticação e aceita apenas o prefixo `voice/<userId>/`. O webhook de pagamento valida o corpo bruto com HMAC SHA-256 e aplica eventos de forma idempotente.

Os limites de taxa e concorrência são locais ao processo. Antes de escalar horizontalmente, substitua-os por Redis, API Gateway ou outro mecanismo distribuído. O webhook de pagamento é uma fronteira de integração; ele não substitui a homologação de um PSP, a reconciliação financeira, refunds ou chargebacks. O envio de e-mail também depende do webhook externo configurado.

## Documentação complementar

- [Arquitetura da aplicação](docs/APP_ARCHITECTURE.md)
- [Máquina de estados de domínio](docs/DOMAIN_STATE_MACHINE.md)
- [Matriz de implementação](docs/IMPLEMENTATION_MATRIX.md)
- [Auditoria completa e resolução F-001–F-016](docs/RELATORIO_AUDITORIA_COMPLETA_DELIVERY_2026-09-22.md)
- [Instrução técnica de correção](docs/INSTRUCAO_CORRECAO_15_ACHADOS_2026-09-22.md)
- [Instrução técnica da fase cliente e anúncios com IA](docs/INSTRUCAO_FASE_CLIENTE_ANUNCIOS_IA.md)
- [QA Android e iOS](QA_ANDROID_IOS.md)

## Contribuição

Crie uma branch a partir de `main`, mantenha migrations e testes no mesmo commit da mudança de schema ou contrato e execute a matriz de validação local. Pull requests direcionados a `main` passam pelos workflows `Pediu CI` e `Pediu Operational Validation`.

## Referências

[1]: https://docs.expo.dev/ "Expo Documentation"
[2]: https://docs.expo.dev/router/introduction/ "Expo Router Documentation"
[3]: https://orm.drizzle.team/docs/overview "Drizzle ORM Documentation"
[4]: https://trpc.io/docs "tRPC Documentation"
