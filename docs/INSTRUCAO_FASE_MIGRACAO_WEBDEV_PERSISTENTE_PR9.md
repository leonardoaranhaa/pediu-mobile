# Instrução Técnica: Migração do Pediu Mobile para o Projeto Mobile WebDev Persistente (PR #9)

## Contexto e Objetivo
O usuário explicitou a arquitetura em produção adotada no outro app (**OrçaFácil**):
1. **Repositório Git Oficial (`/home/ubuntu/pediu-mobile`)**: clone do GitHub onde o código é mantido, versionado, auditado e enviado para o PR #9 (`cursor/phase1-hybrid-ux-a9df`).
2. **Projeto Mobile WebDev Persistente (`/home/ubuntu/pediu-app`)**: ambiente gerenciado pela Manus com template `mobile-app` (Expo SDK 54, React Native, Expo Router, Express, tRPC, Drizzle MySQL, Metro e API gerenciados pelo WebDev).
3. **Preview Web (`8081-...manus.computer`)**: ferramenta de QA e navegação no navegador dentro do sandbox, **não é o APK** e não é o aplicativo nativo final.
4. **Artefatos Nativos (APK / AAB)**: gerados via **EAS Build** (preview para APK Android / simulador iOS; production para AAB voltado ao Google Play Console / EAS Submit).
5. **Segredos e Credenciais**: segregados entre variáveis públicas (`EXPO_PUBLIC_*`) e segredos do servidor injetados via `webdev_request_secrets` e EAS, **nunca no código cliente nem commitados no Git**.

## Premissas e Regras de Segurança
- Não substituir o repositório `/home/ubuntu/pediu-mobile` por um scaffold vazio.
- Não perder nenhuma entrega já integrada e validada (Mercado, Flash, Club, Estúdio de Anúncios com IA, Redesign Pediu3, Mascote, Dock, Checkout Server-Side, Drizzle MySQL, Testes e CI).
- Sincronização unidirecional do clone Git oficial para o projeto WebDev persistente (`pediu-app`), excluindo:
  - `.git/`
  - `node_modules/`
  - `android/`
  - `dist/`
  - `.env*` locais e temporários
  - caches do Gradle e Expo
- Utilizar `webdev_init_project` com scaffold `mobile-app` no diretório `pediu-app`.
- Validar a compatibilidade da persistência (MySQL do template WebDev com as migrations de `drizzle/`).
- Reiniciar o servidor com `webdev_restart_server` e validar com `webdev_check_status`.
- Registrar checkpoint com `webdev_save_checkpoint`.
- Commit e push das instruções e scripts para o PR #9 no GitHub.

## Fluxo Operacional da Fase
1. **Inicialização**: `webdev_init_project` com scaffold `mobile-app`, nome `pediu-app`.
2. **Sincronização**: script versionado `scripts/sync-to-webdev.sh` que copia de `/home/ubuntu/pediu-mobile` para `/home/ubuntu/pediu-app` preservando metadados do WebDev.
3. **Instalação / Dependências**: `pnpm install` no diretório `pediu-app` se necessário.
4. **Migrações do Banco**: aplicar migrations existentes do Pediu no banco gerenciado pelo WebDev.
5. **Reinício e Diagnóstico**: `webdev_restart_server` e `webdev_check_status`.
6. **QA de Navegação**: screenshot ou teste de rota do preview gerenciado.
7. **Checkpoint**: `webdev_save_checkpoint` com mensagem descritiva.
8. **Documentação e Atualização do README**: vincular ao PR #9.
