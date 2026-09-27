# Instrução técnica — limites de voz e payload no PR #7

## Objetivo

Provar que a fronteira HTTP e os contratos de voz rejeitam entradas excessivas antes de executar LLM, storage, transcrição ou outras operações externas. A fase cobre o limite global de JSON e os limites específicos de comando e áudio base64 já definidos no router.

O smoke deve comprovar que payload JSON acima de 16 MB retorna 413 e que comando de voz acima de 500 caracteres retorna 400 sem execução. Os testes unitários também cobrem base64 inválido, áudio abaixo do mínimo e assinatura incompatível com o MIME informado.

## Fonte da verdade e limites

Todas as alterações pertencem à branch `docs/go-live-plan`, head do PR #7, e o registro final será anexado a `docs/GO_LIVE_PLAN.md`. O baseline de deployment, stress, CORS, storage, checkout/webhook e fiado será executado antes da alteração. Nenhum áudio real, chamada de provedor ou LLM será simulado como sucesso.

## Critérios de aceite

- [x] Baseline antes da fase registrado.
- [x] Smoke HTTP de payload acima do limite versionado.
- [x] Limite de comando de voz e entrada base64 cobertos por regressão.
- [x] MIME e assinatura de áudio incompatíveis falham antes de storage/transcrição.
- [x] Matriz local completa, deployment smoke e stress após a alteração.
- [ ] CI e Operational Validation verdes no head publicado.

## Evidência

Os smokes usaram somente payloads sintéticos, sem credenciais ou conteúdo de usuário. Contra o bundle real, o limite global falhou com HTTP 413 e o comando acima de 500 caracteres com HTTP 400. As 5 regressões focadas cobriram comando acima do limite, base64 acima do limite, base64 inválido, áudio abaixo de 1 KB e assinatura incompatível. A matriz local passou com 31 arquivos e 133 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` ficaram verdes. Deployment smoke, CORS, storage, checkout/webhook e fiado permaneceram verdes; stress 120/12 passou com p50 de 15,3 ms, p95 de 29,9 ms, máximo de 68,5 ms e erro 0%.

Os limites validam a fronteira e impedem execução externa indevida; transcrição real, storage externo, áudio de usuário e provedor de voz continuam dependências sem homologação.
