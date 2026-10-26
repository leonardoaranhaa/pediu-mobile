# Instrução Técnica — Google OAuth e conta persistida no APK

## Objetivo

Habilitar a criação e o login de contas pelo provedor Google dentro do portal OAuth oficial, garantindo que o primeiro acesso crie um usuário no MySQL do Pediu e que os acessos seguintes reutilizem a mesma identidade `openId`, tanto no WebDev quanto no APK Android de preview.

## O que já existe

- O portal OAuth do Pediu já oferece Google, Microsoft, Apple e outras opções conforme a conta/ambiente.
- O cliente Expo abre o portal oficial por `startOAuthLogin()` e não recebe senha ou credencial Google.
- O callback nativo usa o deep link `pediupediu://oauth/callback`.
- O endpoint `/api/oauth/mobile` troca `code + state`, chama `sdk.getUserInfo()`, executa `upsertUser()` por `openId`, cria uma sessão de um ano e devolve `app_session_id`.
- O APK armazena esse token no `expo-secure-store` e envia `Authorization: Bearer` para a API.
- A tabela `users` é a fonte persistida de identidade; não é necessário criar uma tabela paralela de contas Google.

## Mudanças desta fase

1. Tornar explícito na UI que o cadastro e o acesso acontecem pelo portal seguro, com Google disponível como provedor.
2. Cobrir por teste o contrato de primeiro login e login repetido com o mesmo `openId`.
3. Configurar no WebDev os valores públicos do portal/app e uma URL HTTPS da API que o APK consiga alcançar.
4. Validar o callback nativo, o armazenamento SecureStore, `/api/auth/me` e a persistência sem duplicidade.
5. Preparar o perfil EAS `preview` para gerar APK; o build só será disparado quando `EXPO_TOKEN`, projeto EAS e URL API estiverem configurados de forma segura.

## Configuração segura

| Variável | Uso | Local permitido |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | API HTTPS usada pelo APK | EAS/WebDev; valor público, sem segredo |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Portal oficial que apresenta Google | EAS/WebDev; valor público |
| `EXPO_PUBLIC_APP_ID` | Identificador público do app OAuth | EAS/WebDev; valor público |
| `EXPO_PUBLIC_OAUTH_SERVER_URL` | Origem pública do servidor OAuth quando exigida pelo runtime | EAS/WebDev; valor público |
| `OAUTH_SERVER_URL` | Comunicação server-side com o provedor | Secret do WebDev/EAS quando aplicável |
| `DATABASE_URL` | MySQL persistente das contas | Secret server-side |
| `JWT_SECRET` | Assinatura/segurança de sessão quando usada pelo runtime | Secret server-side |

### Como e onde adquirir a URL pública do Expo

1. **Ambiente de Testes / Sandbox (QA Atual)**:
   - A infraestrutura da sandbox expõe a API do servidor (porta 3000) via HTTPS no padrão `https://3000-<sandbox-id>.<regiao>.manus.computer`.
   - O script `scripts/load-env.js` já mapeia e injeta automaticamente essa URL no cliente do aplicativo sem que você precise digitá-la manualmente para testes locais.

2. **EAS Build (Painel Expo Cloud)**:
   - No site [expo.dev](https://expo.dev), acesse seu projeto > **Project Settings** > **Environment variables**.
   - Defina `EXPO_PUBLIC_API_BASE_URL` para o ambiente `preview` ou `production` com o endereço HTTPS do seu servidor.

3. **Ambiente de Produção (Go-Live Comercial)**:
   - Para um APK ou AAB definitivo na Google Play Store, a URL deve ser um domínio HTTPS estável 24/7 (ex: `https://api.pediu.app` ou `https://pediu.manus.space`).
   - Não utilize URLs temporárias de sandbox para builds destinados à loja, pois instâncias de teste hibernam após inatividade.

Nunca colocar `EXPO_TOKEN`, client secret Google, JWT, cookie, authorization code ou senha em `EXPO_PUBLIC_*`, Git, APK manual ou chat.

## Fluxo de teste

1. Configurar os valores públicos pelo secret manager do WebDev/EAS.
2. Confirmar `/api/health`, `/api/readyz` e `GET /api/auth/me` anônimo.
3. Gerar APK preview com a mesma `EXPO_PUBLIC_API_BASE_URL` HTTPS do ambiente que contém o banco persistente.
4. Instalar o APK e tocar em **Criar conta com Google**.
5. Concluir Google no navegador do dispositivo; o provedor deve retornar ao deep link `pediupediu://oauth/callback`.
6. Confirmar `POST /api/oauth/mobile` 200, token no SecureStore e `auth.me` com usuário persistido.
7. Fazer logout, repetir o login com a mesma conta e confirmar o mesmo `openId`/`users.id`, sem duplicidade.
8. Reiniciar o APK e confirmar que o token protegido restaura a sessão; se expirado/inválido, limpar a sessão e exigir novo login.

## Gates

Executar testes OAuth focados, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` e `git diff --check`. Sincronizar para `/home/ubuntu/pediu-app`, reiniciar API/Metro, validar health/readiness e stress bounded. Só então salvar checkpoint WebDev. EAS preview e instalação real dependem de `EXPO_TOKEN` e do projeto remoto; não executar submit ou Google Play.

## Bloqueios legítimos

- Google/Cloudflare/MFA pode exigir interação manual do usuário no navegador.
- Um APK antigo não incorpora uma nova `EXPO_PUBLIC_API_BASE_URL`; ele precisa ser reconstruído após a configuração.
- O preview HTTPS do WebDev é adequado para QA, mas não deve ser tratado como endpoint comercial permanente.
- Sem `EXPO_TOKEN` e projeto EAS vinculado, o código pode ser validado, mas não é possível disparar um novo APK remoto.

## Rollback

Desabilitar apenas as variáveis públicas OAuth no ambiente de preview e voltar ao checkpoint anterior. Não apagar usuários persistidos nem modificar `users` por SQL para simular Google, e não contornar o callback ou a autorização do provedor.
