# Fase — Preview manual navegável no sandbox

**Projeto:** Pediu Mobile  
**Branch:** `cursor/phase1-hybrid-ux-a9df`  
**Objetivo:** permitir navegar no Pediu dentro do sandbox sem exigir login da Expo para o uso do preview.

## Modelo adotado

O preview possui duas partes:

1. **API:** backend Express/tRPC em uma porta própria, com MySQL e readiness reais.
2. **Aplicativo Web:** export estático produzido pelo Expo Metro e servido por um servidor Node simples do próprio projeto, com fallback SPA para rotas como `/market`, `/club`, `/seller` e `/courier`.

O usuário acessa o aplicativo pelo navegador em uma URL HTTPS da sandbox. Não é necessário autenticar na Expo para navegar no aplicativo. `EXPO_TOKEN` somente é necessário para operações EAS, como build remoto, credenciais e submissão a lojas.

## Variáveis

O arquivo local é:

```text
/home/ubuntu/.config/pediu/sandbox-preview.env
```

Ele contém somente variáveis públicas, principalmente:

```bash
EXPO_PUBLIC_API_BASE_URL=https://3000-<sandbox>.manus.computer
```

Não inserir nesse arquivo `EXPO_TOKEN`, chaves de pagamento, `JWT_SECRET`, credenciais Google Play ou qualquer segredo do backend. O cliente Expo embute `EXPO_PUBLIC_*` no bundle, portanto esses valores são públicos por definição.

OAuth depende de um portal estável e de `EXPO_PUBLIC_APP_ID`/URLs OAuth correspondentes. Enquanto eles não forem configurados, o restante do preview permanece navegável, mas o login real pode ficar indisponível.

## Executar

Com a API já disponível:

```bash
cd /home/ubuntu/pediu-mobile
pnpm preview:sandbox
```

O comando exporta o Web atual e serve o resultado em `0.0.0.0:8081`. O fallback SPA garante que abrir uma rota diretamente não resulte em 404.

Para desenvolvimento com hot reload, `pnpm dev:metro` continua disponível. O modo desta fase é diferente: ele gera um bundle estático e o serve manualmente, sem depender de sessão Expo no navegador.

## Validação realizada

A API do sandbox foi validada com:

- `GET /api/health` retornando `ok: true`;
- `GET /api/readyz` retornando database, migrations e tables em `pass`;
- branch `cursor/phase1-hybrid-ux-a9df` no commit atual do PR #9.

O endereço esperado do preview nesta sessão é:

```text
https://8081-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer
```

O endereço da API correspondente é:

```text
https://3000-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer
```

Essas URLs públicas são temporárias da sessão do sandbox. Para um ambiente persistente, usar um domínio HTTPS estável e atualizar `EXPO_PUBLIC_API_BASE_URL` sem colocar segredo no bundle.
