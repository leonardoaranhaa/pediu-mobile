# Fase — Build no sandbox e publicação controlada no Google Play

**Projeto:** Pediu Mobile  
**Branch:** `cursor/phase1-hybrid-ux-a9df`  
**Base:** PR #9 sobre `main`

## Resposta técnica

O Manus pode gerenciar o ciclo de versões e executar EAS CLI, mas a compilação local e a publicação têm limites diferentes:

- **Android local no sandbox:** tecnicamente possível depois de instalar Android SDK, platform-tools, build-tools, NDK e Gradle. O sandbox atual possui Java 21, mas não possui `ANDROID_HOME`, `adb`, `sdkmanager`, Gradle ou diretórios nativos `android/`.
- **Android pelo EAS Cloud:** caminho recomendado para builds reproduzíveis. O perfil `preview` já gera APK instalável; o perfil `production` gera AAB apropriado para o Google Play.
- **iOS Simulator:** possível pelo EAS Cloud com `ios.simulator: true`, sem Apple Developer Program. O artefato é para simulador, não para iPhone físico.
- **iOS local no sandbox:** não é possível neste Linux porque exige Xcode, CocoaPods e ferramentas Apple. O EAS Cloud deve executar essa parte.
- **Google Play:** o Manus pode fazer o upload via `eas submit`, mas precisa de uma conta Google Play Developer, aplicativo criado no Play Console e uma Service Account com acesso à API do Play Console. O APK de preview não é o artefato de loja; a loja exige AAB de produção.

## Proteções aplicadas

O perfil de submissão Android foi configurado para `track: internal` e `releaseStatus: draft`. Isso permite enviar o AAB para o fluxo de testes internos sem disponibilizá-lo publicamente nem iniciar rollout de produção. Nenhuma submissão foi executada nesta fase.

Também foram adicionadas exclusões para chaves de Service Account e artefatos de assinatura. A `EXPO_PUBLIC_API_BASE_URL` é pública e fica embutida no aplicativo; ela nunca deve ser confundida com segredo. O `EXPO_TOKEN`, credenciais do Google Play e chaves de assinatura devem permanecer em ambiente seguro/EAS Credentials.

## Variáveis e credenciais

### EAS/preview

- `EXPO_TOKEN`: token de acesso do Expo/EAS, somente no ambiente seguro de execução.
- `EXPO_PUBLIC_API_BASE_URL`: URL HTTPS estável do backend preview.
- `EXPO_PUBLIC_APP_ID`: deve coincidir com `VITE_APP_ID` do backend.
- `EAS_PROJECT_ID`: identificador do projeto EAS, se necessário para vínculo explícito.
- URLs públicas de OAuth, quando usadas pelo ambiente preview.

### Google Play

A chave JSON da Service Account não deve ser colocada em `EXPO_PUBLIC_*`, no bundle ou em um `.env` versionado. O caminho recomendado é cadastrá-la nas credenciais do projeto EAS ou no mecanismo de arquivo/segredo do CI utilizado para o `eas submit`.

## Fluxo recomendado

1. Injetar `EXPO_TOKEN` e variáveis públicas no cofre seguro local/EAS.
2. Confirmar o projeto remoto com `eas project:info`.
3. Executar `eas build --profile preview --platform android` para APK.
4. Executar `eas build --profile preview --platform ios` para iOS Simulator.
5. Validar as URLs, health/readiness do backend, bundle e smoke visual antes de qualquer release.
6. Criar o app no Play Console usando o identificador permanente `space.manus.pediu.mobile`.
7. Conceder à Service Account somente as permissões necessárias de publicação/testes.
8. Executar `eas build --platform android --profile production` para gerar AAB.
9. Enviar o AAB com `eas submit --platform android --profile production --latest --non-interactive`. A configuração atual mantém a release como draft no track interno.
10. Fazer a promoção dentro do Play Console somente depois de revisar conteúdo, política, privacidade, screenshots, classificação etária, dados coletados e requisitos de testes.

## O que continua exigindo ação do proprietário

A criação/validação da conta Google Play Developer, aceite de declarações legais, configuração da ficha da loja, dados fiscais/pagamento, políticas de privacidade e decisão de promover a release para produção não devem ser automatizados silenciosamente pelo Manus. O upload para Internal Testing/Draft pode ser automatizado após as credenciais estarem configuradas; a publicação pública exige revisão e confirmação explícita.

## Evidência de ambiente atual

Em 2026-10-09, a auditoria local encontrou Java 21 e recursos suficientes de disco/memória, mas nenhum Android SDK/Gradle/ADB, nenhum diretório nativo gerado e nenhuma integração Expo/Google Play configurada no ambiente Manus. O preview Web/API continuam separados do build nativo e não devem ser usados como endpoint comercial permanente.

## Referências oficiais

- [1]: https://docs.expo.dev/build-reference/local-builds/ "Run EAS Build locally with local flag"
- [2]: https://docs.expo.dev/build-reference/apk/ "Build APKs for Android Emulators and devices"
- [3]: https://docs.expo.dev/build-reference/simulators/ "Build for iOS Simulators"
- [4]: https://docs.expo.dev/eas/environment-variables/ "Environment variables in EAS"
- [5]: https://docs.expo.dev/submit/android/ "Submit to the Google Play Store with EAS Submit"
- [6]: https://docs.expo.dev/deploy/submit-to-app-stores/ "Submit to app stores"
- [7]: https://support.google.com/googleplay/android-developer/answer/9859152?hl=en "Create and set up your app"
