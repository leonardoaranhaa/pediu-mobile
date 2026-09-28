# Instrução técnica — pré-validação de dispositivos reais no PR #7

## Objetivo

Preparar e verificar o bundle Expo antes da execução da Fase 7 — Dispositivos reais. Esta instrução **não substitui** testes em aparelhos Android/iOS e não pode marcar a fase como concluída sem evidência física.

## Fonte da verdade

- Branch: `docs/go-live-plan`
- PR: `#7`
- Plano: `docs/GO_LIVE_PLAN.md`
- Comando: `pnpm go-live:device-preflight`

## Escopo executável na sandbox

O preflight valida, sem imprimir valores de secrets:

- identidade nativa `Pediu`, versão e scheme `pediupediu`;
- bundle ID iOS e package Android;
- dependências Expo para linking, localização, notificações e sessão segura;
- plugins Expo de router, localização e notificações;
- `EXPO_PUBLIC_API_BASE_URL` apontando para HTTPS público alcançável pelo aparelho;
- alinhamento entre `EXPO_PUBLIC_APP_ID` e `VITE_APP_ID`;
- perfis EAS `preview` e `production`;
- presença das configurações externas de OAuth, Forge, storage, push e PIX;
- ausência de evidência física, explicitamente classificada como `NOT_CONFIGURED`.

## Execução local

```bash
EXPO_PUBLIC_API_BASE_URL='https://staging.example.com' \
EXPO_PUBLIC_APP_ID='pediu-staging' \
VITE_APP_ID='pediu-staging' \
pnpm go-live:device-preflight
```

O comando retorna três estados:

- `PASS`: contrato estrutural ou configuração verificada;
- `BLOCKED`: configuração inválida que impede o bundle;
- `NOT_CONFIGURED`: dependência externa ou evidência ainda ausente.

`BLOCKED` encerra o comando com código diferente de zero. `NOT_CONFIGURED` permanece explícito e não é convertido em falso verde.

## Matriz Android obrigatória

Executar em pelo menos:

- aparelho de entrada;
- aparelho intermediário;
- Android atualizado;
- Android com pouca memória;
- Wi-Fi;
- 4G/5G;
- internet instável;
- GPS desligado;
- permissão de localização negada e concedida;
- app em background;
- app encerrado e reaberto.

Em cada combinação, registrar: modelo, versão do sistema, build, estado da rede, permissões, resultado, logs/crash e evidência visual quando houver.

## Matriz iOS obrigatória

Executar em aparelhos reais e registrar:

- login e recuperação de sessão;
- localização e alteração de permissão;
- notificações;
- deep link `pediupediu:///oauth/callback`;
- background;
- checkout;
- comportamento após atualização;
- modelo, versão do iOS, build, resultado e evidências.

## Gates obrigatórios antes de avançar

Antes e depois de qualquer alteração no bundle:

```bash
pnpm check
pnpm test
pnpm build
pnpm lint
pnpm exec prettier --check scripts/device-preflight.ts scripts/go-live-device-preflight.ts tests/go-live-device-preflight.test.ts docs/INSTRUCAO_FASE_DISPOSITIVOS_REAIS_PR7.md
pnpm go-live:device-preflight
DEPLOYMENT_URL='https://staging.example.com' DEPLOYMENT_REQUIRED=1 pnpm go-live:deployment
STRESS_BASE_URL='https://staging.example.com' STRESS_ALLOW_REMOTE=1 STRESS_REQUESTS=120 STRESS_CONCURRENCY=12 pnpm go-live:stress
```

## Bloqueadores externos

A Fase 7 não pode ser marcada como concluída enquanto não existirem:

- dispositivo Android físico e dispositivo iOS físico;
- acesso ao Expo Go ou build EAS instalável;
- API HTTPS de staging/produção estável;
- OAuth real e redirects registrados;
- configuração de push real;
- storage externo para fluxos que dependem de asset;
- PSP/PIX real e CNPJ para checkout financeiro real.

Nenhum pagamento, push, localização ou notificação será simulado como evidência de aparelho real.

## Evidência do preflight nesta fase

O preflight versionado foi executado com a API pública temporária e o app ID alinhado ao backend. O resultado foi `PASS=6`, `BLOCKED=0` e `NOT_CONFIGURED=5`. Passaram identidade nativa, dependências, plugins Expo, URL HTTPS pública, alinhamento de app ID e perfis EAS.

Permaneceram `NOT_CONFIGURED` OAuth real, Forge para push/storage, PSP/PIX e a evidência física Android/iOS. Esses estados são deliberados: o script não inventa credenciais nem transforma preview web/Expo Go em aprovação de aparelho real.

Antes e depois da implementação, o deployment smoke público passou com health 200, marketplace 200, CORS exato e métricas protegidas. O stress read-only final passou com 120 requests, concorrência 12, p50 de 24,2 ms, p95 de 88,4 ms, máximo de 145,2 ms e erro 0%.

## Estado da fase

- Preflight estrutural: concluído e versionado.
- Android/iOS físicos: `NOT_CONFIGURED` até execução pelo usuário/equipe em aparelhos reais.
- Status comercial: continua bloqueado; esta instrução prepara a homologação e não declara READY.
