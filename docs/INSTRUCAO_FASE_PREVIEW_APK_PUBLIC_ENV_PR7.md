# Instrução técnica — preview APK e variáveis públicas no PR #7

## Objetivo

Preparar o projeto Expo para um build EAS `preview` que gere um APK Android instalável, com todos os caminhos já implementados no cliente e com a API pública correta embutida no bundle.

A configuração deve manter a separação entre:

- **variáveis públicas**, incorporadas ao cliente Expo e visíveis no APK;
- **segredos do servidor**, mantidos somente no ambiente backend/EAS e nunca enviados ao cliente.

## Variáveis públicas do cliente

O ambiente EAS `preview` deve fornecer:

| Variável                       |      Obrigatória | Regra                                                                                                                                |
| ------------------------------ | ---------------: | ------------------------------------------------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_API_BASE_URL`     |              Sim | URL HTTPS pública e estável do backend, sem barra final; não pode ser localhost ou URL temporária do sandbox para um APK distribuído |
| `EXPO_PUBLIC_APP_ID`           |              Sim | Deve coincidir com `VITE_APP_ID` do backend do mesmo ambiente                                                                        |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Para login OAuth | Portal público de autenticação                                                                                                       |
| `EXPO_PUBLIC_OAUTH_SERVER_URL` | Para login OAuth | Servidor público usado pelo callback/contrato OAuth                                                                                  |
| `EXPO_PUBLIC_OWNER_OPEN_ID`    |         Opcional | Identidade pública contextual do proprietário                                                                                        |
| `EXPO_PUBLIC_OWNER_NAME`       |         Opcional | Nome público contextual do proprietário                                                                                              |

O modelo está em `.env.preview.example`. Para uma execução local, copie-o para `.env.preview.local` e preencha os valores públicos; o loader lê esse arquivo quando `EAS_BUILD_PROFILE=preview`. Nenhum token privado, segredo de webhook, senha de banco, Access Token do PSP ou chave Forge pode usar o prefixo `EXPO_PUBLIC_`.

## Configuração EAS

O perfil `preview` usa `environment: preview`, distribuição interna e `android.buildType: apk`. O comando `pnpm build:preview` foi tornado explícito para `--platform android`.

Os perfis `development` e `production` também declaram seus ambientes EAS correspondentes para evitar mistura de configurações.

## Guardrails

- Builds EAS `preview` e `production` falham quando `EXPO_PUBLIC_API_BASE_URL` não é HTTPS público.
- O loader pode mapear `API_BASE_URL` para `EXPO_PUBLIC_API_BASE_URL` em execuções locais, sem expor segredos.
- O APK não deve apontar para `localhost`, IP privado ou URL temporária do sandbox; o sandbox serve para validação, não para a dependência operacional do APK.
- Login OAuth, pagamento real, push, storage e IA continuam dependentes das credenciais/serviços externos correspondentes.

## Evidência e bloqueios atuais

A compilação local do Expo Web e dos bundles Hermes Android/iOS já passou no commit `ca70c7a`. O sandbox não possui Android SDK/Xcode para gerar APK/IPA localmente.

Para disparar o APK EAS real ainda são necessários:

1. uma API HTTPS estável implantada;
2. URLs públicas OAuth e o `EXPO_PUBLIC_APP_ID` real;
3. projeto Expo/EAS vinculado e autenticação EAS (`EXPO_TOKEN` ou login interativo);
4. variáveis do ambiente EAS `preview` cadastradas sem segredos no cliente.

A URL HTTPS temporária do sandbox não deve ser usada como endpoint permanente do APK, pois deixa de funcionar quando o sandbox hiberna ou é recriado.
