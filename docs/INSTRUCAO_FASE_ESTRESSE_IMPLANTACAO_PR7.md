# Instrução técnica — estresse e verificação de implantação no PR #7

## Objetivo

Antes de avançar para qualquer nova fatia funcional do Pediu, esta fase deve demonstrar duas propriedades: a API suporta uma carga concorrente controlada sem regressão evidente, e uma implantação HTTP real responde pelos contratos mínimos de saúde e marketplace. O PSP PIX permanece conscientemente fora do escopo de conclusão desta fase por depender da criação do CNPJ e da homologação comercial.

## Regra de segurança

O teste de estresse é somente leitura. Ele usa `GET /api/health` e a consulta pública `pediu.marketplace.search`; não cria pedidos, pagamentos, usuários, lojas ou alterações de configuração. Por padrão, o script recusa hosts remotos. Para testar um staging ou produção, é necessário declarar explicitamente `STRESS_ALLOW_REMOTE=1`, limitar a quantidade de requisições e obter autorização operacional para a carga.

A verificação de implantação não confunde o preview temporário da sandbox com produção. Ela recebe uma URL por `DEPLOYMENT_URL` e valida HTTP 200 no health check, resposta válida do marketplace e, quando informado, CORS exato para a origem esperada. `DEPLOYMENT_REQUIRED=1` transforma a ausência da URL em falha; sem essa flag, a execução apenas registra `NOT_CONFIGURED`.

## Critérios de aceite

| Controle         | Aceite                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Estresse         | zero erros HTTP, ou taxa dentro do limite declarado; p95 dentro do orçamento declarado     |
| Concorrência     | quantidade efetiva de workers e requisições registrada sem executar mutations              |
| Implantação      | `/api/health` responde `200` com `{ ok: true }`                                            |
| Contrato público | `pediu.marketplace.search` responde sem erro tRPC                                          |
| CORS             | quando uma origem é fornecida, o servidor devolve exatamente essa origem e nunca `*`       |
| Evidência        | URL/commit/ambiente e métricas ficam registrados sem expor segredos                        |
| PSP              | permanece explicitamente pendente até CNPJ, credenciais, sandbox e homologação do provedor |

## Execução local

```bash
pnpm go-live:stress
DEPLOYMENT_URL=https://staging.example.com DEPLOYMENT_REQUIRED=1 pnpm go-live:deployment
```

Para um host remoto, o estresse exige também `STRESS_ALLOW_REMOTE=1`. Os parâmetros `STRESS_REQUESTS`, `STRESS_CONCURRENCY`, `STRESS_TIMEOUT_MS`, `STRESS_MAX_ERROR_RATE` e `STRESS_MAX_P95_MS` podem ser ajustados pelo ambiente; os defaults são conservadores e não constituem certificação de capacidade.

## Limitações

Este controle é um baseline de regressão, não um teste de capacidade de produção. Ele não substitui load test distribuído, teste de longa duração, múltiplas instâncias, Redis para rate limit, observabilidade, backup/restore, dispositivos reais ou homologação do PSP. Uma implantação temporária da sandbox serve para verificar o processo HTTP, mas não altera o status de staging ou produção no plano de Go-Live.

## Registro da execução — 25/09/2026

A implementação foi adicionada ao head do PR #7 antes de iniciar qualquer próxima etapa funcional. O bundle de produção foi gerado com `pnpm build` e executado sobre banco MariaDB limpo. O smoke local confirmou health 200, marketplace 200 e preflight CORS exato. O baseline local executou 120 requisições somente leitura com 12 workers, p95 de 64,4 ms e erro zero.

A mesma API foi acessada pela URL HTTPS pública temporária da sandbox. O deployment smoke confirmou health, marketplace e CORS; o estresse controlado executou 40 requisições com 4 workers, p95 de 53,7 ms e erro zero. Essa URL é uma implantação temporária do ambiente de execução, não um ambiente permanente de staging ou produção.

A busca de deployments não encontrou projeto Vercel nem deployment GitHub associado a `leonardoaranhaa/pediu-mobile`. Para impedir que essa lacuna fique implícita, foi criado o workflow manual `.github/workflows/deployment-smoke.yml`, que recebe a URL real, exige `DEPLOYMENT_REQUIRED=1` e executa tanto o smoke de implantação quanto o baseline de estresse remoto.
