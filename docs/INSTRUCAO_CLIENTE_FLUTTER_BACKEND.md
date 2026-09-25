# Instrução técnica — cliente Flutter integrado ao backend Pediu

## Objetivo

Criar um cliente Flutter nativo, independente do cliente Expo existente, reutilizando o backend Express/tRPC do Pediu como fonte única de verdade para autenticação, catálogo, preços, cotação, pedidos, pagamentos e histórico.

## Escopo desta fase

A primeira entrega deve cobrir a fundação do aplicativo cliente: configuração por ambiente, armazenamento seguro de sessão Bearer, cliente HTTP compatível com endpoints tRPC v11, login OAuth mobile por deep link, descoberta de produtos, detalhe, carrinho local, cotação server-side, checkout com PIX/dinheiro, pedidos e perfil básico. O cliente deverá ser criado em `flutter_app/` para não interferir no aplicativo Expo atual.

O cliente Flutter não deve duplicar regras financeiras do servidor. O preço exibido pode ser usado para apresentação, mas o fluxo de checkout deve consultar `pediu.checkout.quote` e enviar ao servidor a chave de idempotência, o endereço e os itens. A validação final permanece no endpoint `pediu.orders.create`.

## Decisões de arquitetura

A integração utilizará chamadas HTTP diretas para os endpoints tRPC, com `superjson` em formato JSON compatível com os contratos simples do backend. O cliente centralizará essa lógica em `ApiClient`, incluindo URL base, Bearer token, timeout, tratamento de erros e conversão das respostas `{ result: { data: { json: ... } } }`.

A sessão nativa será armazenada em `flutter_secure_storage`. O carrinho será persistido localmente para permitir retomada, mas nunca será considerado fonte de preço ou disponibilidade. O login OAuth usará `url_launcher` para abrir o portal e `app_links` para receber `pediu://oauth/callback?code=...&state=...`; o aplicativo trocará o code em `/api/oauth/mobile` e armazenará `app_session_id` e `user`.

A navegação inicial utilizará Material 3 e `NavigationBar`, evitando um framework de roteamento adicional enquanto o fluxo principal é estabilizado. As telas serão componentes pequenos e testáveis, com uma camada de estado simples em `ChangeNotifier`.

## Pacotes open source adotados

- [`dart-lang/http`](https://github.com/dart-lang/http): cliente HTTP oficial e mantido pelo ecossistema Dart.
- [`juliansteenbakker/flutter_secure_storage`](https://github.com/juliansteenbakker/flutter_secure_storage): armazenamento seguro de sessão em Android/iOS.
- [`llfbandit/app_links`](https://github.com/llfbandit/app_links): recebimento de deep links OAuth.
- [`flutter/packages`](https://github.com/flutter/packages): `url_launcher` para abrir o portal OAuth.

## Contratos backend usados

| Recurso | Método tRPC | Autenticação | Uso Flutter |
|---|---|---:|---|
| Catálogo | `pediu.marketplace.products` | Pública | Home e busca inicial |
| Busca | `pediu.marketplace.search` | Pública | Filtro e paginação |
| Usuário | `auth.me` | Pública/Bearer | Hidratação da sessão |
| Login mobile | `GET /api/oauth/mobile` | OAuth code/state | Troca por sessão Pediu |
| Endereços | `pediu.addresses.list/create` | Bearer | Checkout |
| Cotação | `pediu.checkout.quote` | Bearer | Subtotal, entrega e desconto |
| Pedido | `pediu.orders.create/mine` | Bearer | Checkout idempotente e histórico |
| PIX | `pediu.payments.createPix` | Bearer | Criação/reuso de cobrança |
| Logout | `auth.logout` | Bearer/cookie | Encerramento de sessão |

## Configuração

O cliente usa `--dart-define`:

```bash
flutter run \
  --dart-define=PEDIU_API_BASE_URL=http://10.0.2.2:3000 \
  --dart-define=PEDIU_OAUTH_PORTAL_URL=https://seu-portal-oauth \
  --dart-define=PEDIU_APP_ID=seu-app-id \
  --dart-define=PEDIU_OAUTH_REDIRECT_URI=pediu://oauth/callback
```

Para um dispositivo físico, `PEDIU_API_BASE_URL` deve apontar para um endereço acessível pelo aparelho ou para o domínio público HTTPS da API. O Android Emulator usa `10.0.2.2` para acessar o host local; iOS Simulator normalmente usa `127.0.0.1`.

## Critérios de aceite

A fase é considerada concluída quando o aplicativo Flutter compilar em Android/iOS, abrir a home com produtos reais, adicionar e remover itens do carrinho, consultar a cotação protegida, solicitar login quando necessário, criar um pedido com idempotência e listar o histórico. O logout deve remover o token seguro. O cliente deve apresentar mensagem útil para API indisponível, sessão expirada, loja fechada, produto indisponível e erro de cotação.

## Limitações conhecidas

O fluxo OAuth mobile depende de um portal OAuth configurado e de um deep link registrado no Android/iOS. O PIX depende da chave PIX da loja e de um provedor real configurado no backend. GPS, notificações push e transcrição de voz não fazem parte desta primeira fundação Flutter; deverão ser adicionados em fases posteriores usando plugins nativos e os mesmos contratos protegidos do backend.

O SDK Flutter stable foi instalado na sandbox e a implementação passou por `flutter analyze`, `flutter test` e `flutter build web --release`. O build Android não foi executado porque a imagem não possui Android SDK; a validação `flutter build apk --debug` deve ser executada em uma máquina com Android SDK configurado.
