# Prioridade 3 — Auth honesta

## Contexto

O Pediu usa **OAuth externo** (`EXPO_PUBLIC_OAUTH_PORTAL_URL` + `EXPO_PUBLIC_APP_ID`). Não há senha local no cliente nem endpoint de “reset password” no app.

Existia uma tela `forgot-password` que **simulava** envio de e-mail (`setSent(true)` sem API). Isso quebrava a confiança do produto.

## O que foi corrigido

| Tela | Comportamento |
|------|----------------|
| `app/forgot-password.tsx` | Explica que não há senha local; oferece login seguro e portal OAuth; não finge e-mail enviado |
| `app/auth/mfa.tsx` | Continua explícita: MFA não valida códigos; oferece login seguro |
| `app/login.tsx` | Texto sobre ausência de senha local + atalho “Problemas para entrar?” |

## O que já era correto

- Login/cadastro só via `startOAuthLogin()` quando `isOAuthConfigured`
- Verificação de e-mail no server (`email-verification.ts`) é outro fluxo (token hash + webhook), não reset de senha
- Sessão nativa em SecureStore / cookie HttpOnly no web

## Critérios de aceite (P3)

- [x] Nenhuma UI afirma que um e-mail de recuperação foi enviado sem backend correspondente
- [x] MFA não coleta código falso
- [x] Usuário consegue voltar ao login seguro a partir das telas de ajuda
- [ ] OAuth de produção homologado (redirect, PKCE/state, domínio) — go-live P0
- [ ] Se no futuro houver senha local ou OTP: implementar provedor + testes antes de reativar UI de coleta

## Quando implementar MFA de verdade

1. Escolher canal (SMS / WhatsApp / TOTP)
2. Provedor + segredos só no server
3. Challenge após OAuth ou em ações sensíveis
4. Rate limit, expiração, tentativas
5. Só então a tela `/auth/mfa` coleta e envia código

## Próximo na sequência (P4)

Suporte da conta: ligar `app/account/support-chat.tsx` ao `pediu.experience.support` (tickets + mensagens reais).
