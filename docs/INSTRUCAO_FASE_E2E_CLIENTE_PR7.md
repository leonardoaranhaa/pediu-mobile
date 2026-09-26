# Instrução técnica — E2E vertical do cliente no PR #7

## Objetivo

Adicionar uma jornada automatizada, reproduzível e isolada que atravesse o backend real do Pediu: catálogo público, sessão Bearer, endereço persistido, cotação server-side, criação de pedido, pagamento PIX pendente, retry idempotente e progressão operacional do pedido pelo lojista.

## Escopo

O smoke será executado contra uma API Express real e um banco MySQL migrado. O fixture criará usuários, loja e produto com identificadores únicos por execução. O cliente será autenticado com uma sessão JWT de teste emitida pelo próprio SDK, sem depender de OAuth externo. O PSP permanece em modo manual de teste: a criação confirma apenas o estado `pending`, nunca `paid`.

## Critérios de aceite

A jornada deve comprovar que o catálogo retorna o produto criado, a localização/endereço é persistida com coordenadas, o quote usa preço e taxa do servidor, o pedido é criado com endereço autorizado, o pagamento permanece pendente, a repetição da mesma chave retorna o mesmo pedido/pagamento sem duplicação e o lojista consegue visualizar e avançar o pedido por `Aceito`, `Preparando` e `Pronto`.

## Limites

Esta fase não marca como concluídos OAuth real, PSP PIX, webhook financeiro, pagamento confirmado, cancelamento, avaliação, push, dispositivos físicos ou UI mobile. Esses itens exigem homologação ou evidência adicional. O script não imprime tokens, credenciais, URL de banco ou payloads sensíveis.

## Execução

- `pnpm go-live:e2e` executa o smoke contra `API_BASE_URL` ou `http://127.0.0.1:$PORT`.
- O workflow operacional deve aplicar migrations, iniciar a API e executar o smoke após o readiness check.
- A evidência deve ser registrada no `docs/GO_LIVE_PLAN.md` sem transformar um smoke de API em aprovação de E2E completo de dispositivo.

## Registro da execução — 25/09/2026

O primeiro smoke contra o banco de preview existente falhou corretamente em `pediu.addresses.create: Please login`. O diagnóstico encontrou `Unknown column 'themePreference' in 'SELECT'`: o banco local tinha um journal híbrido com 14 migrations e tabelas antigas de anúncios, mas não havia aplicado `0022_user_theme_email_verification.sql`. O banco foi mantido fora da evidência para evitar um falso resultado.

Um banco MySQL limpo foi criado e recebeu as 24 migrations versionadas do head do PR #7. A API foi reiniciada sobre esse banco e o smoke passou integralmente: catálogo, endereço com coordenadas, quote server-side, pedido PIX pendente, retry idempotente sem duplicação e progressão operacional do lojista até `Pronto`.

A asserção inicial do quote também revelou uma diferença legítima do contrato persistido: o servidor devolve `name` e `note: null` no item cotado. O teste foi ajustado para validar os campos críticos sem rejeitar campos adicionais compatíveis.

A etapa do CI recebeu `VITE_APP_ID=ci-e2e-app` e `JWT_SECRET=ci-e2e-jwt-secret` exclusivamente no job de teste, e o script falha explicitamente se esses valores não estiverem disponíveis. Nenhum token, segredo ou URL de banco é impresso.
