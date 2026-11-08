# Instrução técnica — Reativação do sandbox Expo Web

**Fase:** reativação do ambiente de preview para validação mobile/web

**Projeto:** Pediu Mobile

**Branch:** `cursor/phase1-hybrid-ux-a9df`

**Head validado:** `b1281a1`

## Objetivo

Disponibilizar novamente o sandbox do Pediu sem alterar o código funcional, sem reiniciar serviços saudáveis desnecessariamente e sem criar bypass de autenticação. O preview deve servir o head atual do PR #9, com API, banco e bundle Expo Web acessíveis localmente e pela URL HTTPS temporária.

## Procedimento executado

1. Foram relidas as instruções do template mobile Expo.
2. Foram conferidos branch, head, workspace e processos residentes.
3. A API existente na porta `3000` e o Metro Expo Web na porta `8081` foram reutilizados, pois já estavam saudáveis e servindo `/home/ubuntu/pediu-mobile`.
4. Foram validados `GET /api/health` e `GET /api/readyz` localmente e pela URL pública.
5. Foi validada a resposta HTTP do Expo Web e a presença do bundle Metro.
6. Foi validado o endpoint público de marketplace tRPC sem criar fixtures nem alterar dados.

## Evidências

- Branch: `cursor/phase1-hybrid-ux-a9df`.
- Head local: `b1281a1`.
- Workspace sem alterações pendentes no momento da conferência.
- API local: `/api/health` HTTP 200.
- API local: `/api/readyz` HTTP 200, com banco, migrations e tabelas aprovados.
- Expo Web local: HTTP 200 na porta `8081`.
- API pública: `/api/health` HTTP 200.
- API pública: `/api/readyz` HTTP 200, com status `ready`.
- Expo Web público: HTTP 200.
- Bundle Metro público: presente em `/node_modules/expo-router/entry.bundle?platform=web...`.
- Marketplace público: endpoint tRPC respondeu HTTP 200.
- Processos confirmados no workspace atual:
  - API em `/home/ubuntu/pediu-mobile`, porta `3000`.
  - Expo Web em `/home/ubuntu/pediu-mobile`, porta `8081`.

## URLs

- [Preview Expo Web](https://8081-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer/)
- [Módulo Pediu Mercado](https://8081-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer/market)
- [API health](https://3000-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer/api/health)
- [API readiness](https://3000-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer/api/readyz)
- [PR #9](https://github.com/leonardoaranhaa/pediu-mobile/pull/9)

## Limites

Esta fase apenas reativa e verifica o preview. Não foram executadas migrations destrutivas, não foram alteradas credenciais e não foram inseridos dados fictícios para mascarar o estado do catálogo. Rotas autenticadas continuam dependendo do login real configurado no ambiente.
