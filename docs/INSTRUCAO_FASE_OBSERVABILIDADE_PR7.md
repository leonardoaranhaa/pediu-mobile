# Instrução técnica — observabilidade operacional mínima no PR #7

## Objetivo

Adicionar uma camada operacional mínima e segura antes das próximas etapas do Go-Live, permitindo verificar volume, erros e latência sem expor dados de negócio ou deixar um endpoint de métricas público.

## Escopo implementado

- `server/_core/observability.ts` agora agrega operações tRPC por procedimento.
- As métricas incluem contagem, erros, taxa de erro, duração média, p95 aproximado por buckets, máximo e uptime.
- A cardinalidade de procedimentos é limitada a 256 entradas; procedimentos excedentes são agregados em `__other__`.
- `GET /api/metrics` exige `Authorization: Bearer <OBSERVABILITY_TOKEN>`, usa comparação em tempo constante e responde `Cache-Control: no-store`.
- O runtime `NODE_ENV=production` exige `OBSERVABILITY_TOKEN`.
- O deployment smoke valida health, marketplace, CORS e autenticação da rota de métricas quando `DEPLOYMENT_METRICS_TOKEN` é informado.
- O workflow operacional injeta um token de teste não sensível para validar o boot e o endpoint.

## Critérios de aceite

1. Chamadas tRPC bem-sucedidas e com erro geram métricas sem incluir usuário, payload ou token.
2. A chamada sem token retorna 401; a chamada com token válido retorna 200 e JSON do serviço `pediu-api`.
3. A resposta de métricas não pode ser armazenada em cache.
4. O processo de produção não inicia com `OBSERVABILITY_TOKEN` ausente.
5. O endpoint permanece dentro do limite de cardinalidade mesmo com procedimentos arbitrários.
6. O bundle passa por typecheck, testes, build, lint, deployment smoke e stress antes de publicação.

## Evidência executada — 26/09/2026

- `pnpm check`: passou.
- `pnpm test`: 27 arquivos passaram, 107 testes passaram e 1 foi ignorado.
- `pnpm build`: passou; bundle de produção gerado.
- `pnpm lint`: passou.
- Testes específicos de observabilidade: 3 passaram.
- Boot sem token em produção: bloqueado com `Missing production configuration: OBSERVABILITY_TOKEN`.
- Deployment smoke local: health 200, marketplace 200, CORS exato e métricas protegidas.
- Stress read-only: 120 requests, concorrência 12, p95 55,8 ms, máximo 70,2 ms, erro 0%.

## Limitação explícita

Este incremento fornece o boundary seguro e os sinais locais. Ainda é necessário conectar o endpoint a um coletor externo, criar dashboards, alertas de disponibilidade/erro/latência/banco/webhook/backup e definir retenção antes do Go-Live definitivo.
