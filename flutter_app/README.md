# Pediu Flutter

Cliente Flutter nativo do Pediu. Ele reutiliza o backend Express/tRPC existente e não cria uma segunda camada de negócio para preços, disponibilidade, descontos ou transições de pedido.

## Executar

Na raiz desta pasta:

```bash
flutter pub get
flutter run \
  --dart-define=PEDIU_API_BASE_URL=http://10.0.2.2:3000 \
  --dart-define=PEDIU_OAUTH_PORTAL_URL=https://seu-portal-oauth \
  --dart-define=PEDIU_APP_ID=seu-app-id \
  --dart-define=PEDIU_OAUTH_REDIRECT_URI=pediu://oauth/callback
```

Para um celular físico, use uma URL HTTPS ou o IP da máquina acessível pelo dispositivo. O Android Emulator usa `10.0.2.2` para alcançar o host local; no iOS Simulator, `127.0.0.1` normalmente funciona.

## OAuth mobile

O cliente abre o portal configurado em `PEDIU_OAUTH_PORTAL_URL` com `appId`, `redirectUri`, `state` e `type=signIn`. O callback precisa retornar para `pediu://oauth/callback?code=...&state=...`. O Flutter chama `GET /api/oauth/mobile`, salva `app_session_id` no armazenamento seguro e hidrata o usuário retornado pelo backend.

O esquema `pediu` já está registrado nos manifests Android/iOS deste cliente. O código também contém o listener de deep link; confirme os identificadores do app e o portal OAuth antes do teste em aparelho.

## Integração de API

O cliente usa chamadas diretas aos endpoints tRPC v11:

- `pediu.marketplace.products` para catálogo público;
- `pediu.marketplace.search` para busca;
- `pediu.checkout.quote` para cotação protegida;
- `pediu.addresses.list/create` para endereços;
- `pediu.orders.create/mine` para checkout idempotente e histórico;
- `pediu.payments.createPix` para cobrança PIX;
- `auth.me/logout` para sessão.

As mutations enviam JSON no envelope tRPC `{"json": ...}` e as queries usam o mesmo envelope no parâmetro `input`. O `ApiClient` injeta `Authorization: Bearer` quando há sessão.

## Validação

```bash
flutter analyze
flutter test
flutter build apk --debug
```

Na sandbox desta sessão, `flutter analyze`, `flutter test` e `flutter build web --release` foram executados com sucesso. O build Android (`flutter build apk --debug`) ficou pendente porque a imagem não possui Android SDK; configure o SDK Android para gerar o APK.
