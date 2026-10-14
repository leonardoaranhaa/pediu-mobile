# Instrução Técnica — Conexão do workflow EAS e build Android/iOS

## Objetivo
Conectar o Pediu ao workflow oficial do Expo Application Services e executar o build remoto para Android e iOS a partir do branch `cursor/phase1-hybrid-ux-a9df`, sem colocar tokens ou credenciais no Git.

## Escopo autorizado

- Validar o projeto Expo e a configuração `eas.json`.
- Confirmar o vínculo com o projeto remoto EAS.
- Executar `npx eas-cli@latest build --platform all` quando a autenticação estiver disponível.
- Acompanhar os jobs e registrar os links dos artefatos gerados.
- Não executar `eas submit`, publicação no Google Play ou App Store nesta fase.

## Pré-condições obrigatórias

- `EXPO_TOKEN` injetado no ambiente seguro de execução; nunca enviado por chat, commit ou arquivo versionado.
- Projeto remoto EAS vinculado ao app Pediu, via `eas project:info` ou configuração `extra.eas.projectId`.
- `EXPO_PUBLIC_API_BASE_URL` apontando para uma API HTTPS estável do ambiente alvo.
- `EXPO_PUBLIC_APP_ID` coerente com o `VITE_APP_ID` do backend e com o provedor OAuth.
- Credenciais de assinatura Android/iOS administradas pelo EAS, sem copiar keystores ou certificados para o repositório.

## Perfis usados

- `preview`: Android em APK para distribuição interna e iOS Simulator.
- `production`: Android em AAB para loja; não será usado automaticamente nesta execução sem revisão adicional.

O comando solicitado com `--platform all` usa o perfil padrão definido pelo EAS. Antes da execução final, confirmar explicitamente se o objetivo é `preview` ou `production`; para validação, o padrão seguro é:

```bash
npx eas-cli@latest build --profile preview --platform all
```

## Validação antes do disparo

1. Branch limpo e atualizado.
2. `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` e `git diff --check` aprovados.
3. `eas project:info` identifica o projeto remoto correto.
4. `eas env:list --environment preview` não expõe valores; apenas confirma nomes necessários.
5. `npx expo config --type public` não contém segredos.
6. `EXPO_PUBLIC_API_BASE_URL` é alcançável por HTTPS.

## Segurança

Não solicitar ou armazenar `EXPO_TOKEN`, certificados Apple, senha Apple, keystore, senha de keystore ou Service Account do Google Play em mensagens. O login deve ocorrer por secret manager, variável protegida ou prompt seguro do ambiente. O build não implica submissão nem publicação.

## Rollback e limites

Se o EAS exigir login, projeto inexistente ou credencial de assinatura ausente, interromper sem criar build parcial. Corrigir a configuração no EAS e repetir apenas o preflight. Falhas de build devem ser analisadas pelos logs do job, sem alterar o branch automaticamente.
