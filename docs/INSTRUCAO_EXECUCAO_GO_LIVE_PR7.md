# Instrução técnica — execução incremental do Go-Live no PR #7

## Fonte da verdade

Todas as alterações desta fase serão feitas sobre a branch `docs/go-live-plan`, head do PR #7, até que o PR alcance o estado operacional definido como **READY**. O plano oficial é `docs/GO_LIVE_PLAN.md`; nenhuma dependência externa será marcada como concluída sem evidência verificável.

## Metodologia

A execução será dividida em blocos. Primeiro serão mapeados os critérios do plano que podem ser reproduzidos localmente ou no CI, como tipagem, testes, build, migrations, health check, contratos críticos e validações de configuração. Depois serão implementados guardrails e verificadores versionados que falhem de forma explícita quando uma variável, migration, contrato ou serviço essencial estiver ausente. Em seguida serão avançadas jornadas E2E e testes de concorrência que não dependam de credenciais de PSP, OAuth real, push, domínio ou dispositivos físicos. Por fim, cada evidência será registrada no plano, mantendo os bloqueadores externos em estado pendente até homologação real.

## Limites de segurança operacional

Não serão criadas credenciais fictícias, não haverá publicação em produção, não serão executados pagamentos reais, nem serão declarados como concluídos backup, restore, PSP, OAuth, e-mail, push, domínios ou testes em Android/iOS sem ambiente e evidência correspondentes. Para dependências que exigem autoridade ou configuração externa, será entregue o contrato técnico, o check automatizado e o procedimento de homologação.

## Primeiro incremento

O primeiro incremento executável é um **Go-Live Readiness Check** versionado, reutilizável localmente e no CI. Ele deve validar invariantes de ambiente, migrations essenciais, health check e presença de configurações obrigatórias sem vazar segredos. O resultado será legível por humanos e por automação, e deverá distinguir `PASS`, `BLOCKED` e `NOT_CONFIGURED`.

## Critérios de aceite da fase inicial

A fase inicial será aceita quando o checker puder rodar sem dependências externas adicionais em modo de código/CI, retornar falha para produção sem configuração mínima, reconhecer o ambiente de teste usado no CI, não imprimir valores sensíveis, possuir testes unitários para regras de classificação e permanecer verde em typecheck, testes, build e lint. O documento `docs/GO_LIVE_PLAN.md` será atualizado somente com evidências reais.


## Registro da primeira execução — 25/09/2026

O primeiro incremento foi implementado no head `38045bfa56010f8b2a3cadd531c79ad1511d9173`. Foram adicionados `scripts/go-live-readiness.ts`, `tests/go-live-readiness.test.ts`, o comando `pnpm go-live:check` e uma etapa equivalente ao workflow `Pediu Operational Validation` após o health check da API.

A execução local contra o banco E2E confirmou 14 migrations, 9 tabelas críticas e HTTP 200 da API. O resultado foi `3 PASS`, `0 BLOCKED` e `10 NOT_CONFIGURED`. Os testes do checker passaram em 4 cenários, incluindo produção sem configuração, ausência de integrações externas, wildcard de origem e garantia de que segredos não aparecem no relatório.

As validações gerais `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, Prettier e `git diff --check` ficaram verdes. As integrações externas continuam deliberadamente pendentes e o plano não foi marcado como pronto para Go-Live.
