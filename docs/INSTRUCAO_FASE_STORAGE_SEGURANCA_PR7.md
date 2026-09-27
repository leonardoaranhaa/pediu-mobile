# Instrução técnica — autorização do storage no PR #7

## Objetivo

Provar contra o bundle real que o proxy de storage não permite leitura anônima, traversal de caminho ou acesso cruzado entre usuários. A fase cobre o namespace `voice/{userId}/...`, sem configurar um backend de storage externo.

O smoke deverá validar que chave inválida falha antes da autenticação, request sem sessão responde 401, chave de outro usuário responde 403 e chave do próprio usuário atravessa a autorização mas retorna 503 quando o backend de storage não está configurado. Esse último resultado é deliberado: não se deve simular URL assinada nem expor asset inexistente.

## Fonte da verdade e limites

Todas as alterações pertencem à branch `docs/go-live-plan`, head do PR #7, e o registro final será anexado a `docs/GO_LIVE_PLAN.md`. O baseline de deployment, stress, CORS, checkout/webhook e fiado será executado antes da implementação. O PSP/PIX, storage externo, assets gerados, domínio real e credenciais de produção permanecem dependências externas.

## Critérios de aceite

- [x] Baseline antes da fase registrado.
- [x] Smoke HTTP com fixture isolada e cleanup versionado.
- [x] Path traversal e chave inválida não chegam à autenticação/backend.
- [x] Acesso anônimo é 401 e acesso a namespace de outro usuário é 403.
- [x] Namespace próprio não vaza erro/URL e falha fechado como 503 sem backend configurado.
- [x] Matriz local completa, deployment smoke e stress após a alteração.
- [ ] CI e Operational Validation verdes no head publicado.

## Evidência

Nenhuma URL assinada, chave de storage ou asset real será fabricado. O smoke passou contra o bundle real usando usuários temporários no MariaDB de validação, sessão Bearer assinada pelo runtime de teste e cleanup no `finally`: traversal retornou 400, acesso anônimo 401, namespace cruzado 403 e namespace próprio 503 por backend externo ausente. A matriz local passou com 30 arquivos e 128 testes aprovados; `pnpm check`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` ficaram verdes. O deployment smoke passou com health 200, marketplace 200, CORS exato e métricas protegidas; stress 120/12 passou com p50 de 19,8 ms, p95 de 37,1 ms, máximo de 68,9 ms e erro 0%. Os smokes CORS, courier, checkout/webhook concorrente e fiado também permaneceram verdes.

O backend de storage externo continua não configurado; portanto o resultado 503 do namespace próprio é uma falha segura e não uma homologação de upload, presign ou entrega de asset.
