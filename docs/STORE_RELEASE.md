# Publicação nas lojas

Este documento descreve o que o repositório já prepara e o que só a conta de desenvolvedor consegue concluir.

## Identidade

O identificador padrão deixou de ser o template `space.manus.pediu.mobile`. O binário usa `app.pediu.mobile`, a menos que `EXPO_PUBLIC_BUNDLE_ID` aponte para um pacote que a conta Apple e a conta Google já controlem. O scheme OAuth continua `pediupediu`.

`APPLE_BUNDLE_ID` no servidor precisa ser o mesmo identificador do app iOS. Sem ele, `POST /api/auth/apple` responde 503. O botão Sign in with Apple aparece no iPhone ao lado do login do provedor já usado pelo aplicativo. Se esse provedor oferecer Google ou outro login de terceiro, os dois botões precisam estar ativos na revisão.

## Contas de revisão

O login de desenvolvimento não entra no perfil `production` do EAS. As contas de revisão são criadas no banco de produção com o mesmo catálogo do ambiente local, sem a rota `/api/dev/login`:

```bash
REVIEW_CUSTOMER_OPEN_ID=... REVIEW_MERCHANT_OPEN_ID=... pnpm db:seed:review
```

O identificador é o `openId` devolvido pelo provedor OAuth, ou `apple:<sub>` quando a entrada for Sign in with Apple. Nome e e-mail opcionais usam `REVIEW_CUSTOMER_NAME`, `REVIEW_CUSTOMER_EMAIL`, `REVIEW_MERCHANT_NAME` e `REVIEW_MERCHANT_EMAIL`. As credenciais de acesso ficam só nas notas de revisão da Apple e no acesso de teste da Play.

## API pública

O perfil `production` do EAS não define `EXPO_PUBLIC_API_BASE_URL` de propósito. `app.config.ts` interrompe o build de produção se essa URL HTTPS estiver ausente ou se `EXPO_PUBLIC_DEV_AUTH=true`. Defina a URL, `EAS_PROJECT_ID` e os segredos no painel do EAS, não no repositório.

No servidor de produção, `NODE_ENV=production` já exige `VITE_APP_ID`, `JWT_SECRET`, `DATABASE_URL` e `ALLOWED_ORIGINS`. Complete também:

- `OAUTH_SERVER_URL` e as variáveis `EXPO_PUBLIC_OAUTH_*` quando o login do provedor estiver ativo
- `APPLE_BUNDLE_ID` para Sign in with Apple
- `PAYMENT_WEBHOOK_SECRET` se um webhook de pagamento for usado
- credenciais de push APNs e FCM pelo `eas credentials`

O aplicativo nativo envia a sessão em `Authorization: Bearer`. O cookie é o caminho do Expo Web.

A imagem em `Dockerfile` sobe a API com `node dist/index.js` na porta 3000. Publique essa imagem atrás de HTTPS no domínio gravado em `EXPO_PUBLIC_API_BASE_URL`.

## Privacidade e pagamento

- `GET /legal/privacy` e `GET /legal/terms` publicam a versão 1.0.
- A tela de privacidade mostra esses endereços antes do aceite.
- Encerrar a conta apaga perfil, endereços, tokens, mensagens e o identificador de login. Pedidos e pagamentos permanecem. A sessão antiga deixa de autenticar.
- O PIX do go-live continua no Mercado Pago. Dinheiro na entrega também permanece disponível.

Use a URL absoluta de `/legal/privacy` na ficha da App Store e da Play Store.

## Build

O preflight de go-live ainda exige o plugin `expo-video`. `submit.production` envia o Android primeiro para a faixa `internal`.

Depois de ligar o projeto no EAS e preencher `extra.eas.projectId` com `EAS_PROJECT_ID`:

```bash
eas build --profile production --platform all
eas submit --profile production --platform all
```

O envio para a App Store Connect ainda precisa do app e da conta Apple configurados no EAS. O envio para a Play precisa da conta de serviço. Este repositório não contém essas credenciais e não gera o AAB ou o IPA sem elas.

Antes da ficha pública, rode no TestFlight e no teste interno da Play: permissão negada, login, pedido em dinheiro, mudança de status até entregue e exclusão de conta. A criptografia declarada continua sendo só a do HTTPS (`ITSAppUsesNonExemptEncryption: false`). O pagamento é de entrega física, em dinheiro.

## Nota para o revisor

Cliente e lojista entram pelo login configurado no servidor. A loja de demonstração é a Lanchonete da Vila, com o cardápio semeado e a loja aberta. O cliente tem um endereço padrão. O pagamento do pedido é dinheiro na entrega. A exclusão da conta fica em Conta, Segurança e privacidade, Encerrar minha conta.
