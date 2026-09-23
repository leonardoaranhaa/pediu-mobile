# Instrução técnica — correção integral dos achados da auditoria

## Objetivo

Corrigir em uma única frente os quinze problemas identificados na auditoria completa do aplicativo de delivery, incluindo o achado adicional F-016 identificado no relatório, preservando o fluxo cliente → loja → pagamento → entrega → pós-venda e mantendo compatibilidade com o PR aberto.

## Estratégia executada

A implementação foi organizada em cinco blocos verificáveis: segurança de transporte e sessão; controle de custos e pagamentos; autorização de lojista, localização e operação de entrega; integridade, paginação e preferências de conta; e testes de regressão. Cada alteração de banco recebeu migration versionada e foi aplicada em uma base MariaDB vazia antes da publicação.

Foram implementados allowlist de origem e proteção de mutations com cookie, saneamento de logs OAuth, remoção de sessão em URL, controles de custo para voz, retirada de cartão até gateway real, webhook de pagamento assinado/idempotente, promoção transacional de lojista, persistência de localização, transições transacionais de entrega, uso centralizado de `getInsertId`, FKs, limites de listagem, storage com ownership por prefixo, validação de `appId`, tema por conta, verificação de e-mail e auditoria administrativa somente após atualização válida.

## Critérios de aceite e evidências

Os validadores locais passaram após as últimas alterações:

```text
pnpm check       ✅
pnpm test        ✅ 22 arquivos, 90 testes; 1 skipped
pnpm build       ✅ dist/index.js ~154,9 KB
pnpm lint        ✅
git diff --check ✅
```

A suíte focada de segurança, administração e entrega também passou com **14 testes**. A validação de banco aplicou as migrations `0000` a `0023` em um MariaDB efêmero limpo, resultando em **34 tabelas**, **49 chaves estrangeiras** e **24 entradas no journal**.

O critério de CI será concluído após o commit e push para `feat/core-marketplace-flow`, com acompanhamento dos workflows do PR #3. Não há E2E versionado com Playwright, Detox ou Appium nesta sessão; essa lacuna permanece explicitamente registrada.

## Decisões de segurança

O CORS não reflete origens arbitrárias. Mutations com cookie dependem de origem permitida; clientes mobile usam Bearer. Logs não contêm códigos OAuth, `state`, cookies, headers ou tokens. Tokens de sessão não são aceitos em URL. O endpoint público de voz tem rate limit, timeout e limite de concorrência por processo; a transcrição autenticada tem quota, validação de MIME/magic bytes, limite binário e timeout.

## Decisões de produto e operação

Cartão foi removido do checkout até existir integração real com gateway e webhook. O cadastro da primeira loja promove o usuário a lojista na mesma transação. A localização automática é persistida como endereço confirmado com coordenadas. Transições de entrega são condicionais, atômicas e idempotentes, enquanto push permanece uma etapa pós-transação. Mudança de e-mail aguarda verificação. O tema é sincronizado por usuário, com fallback local separado para visitantes.

## Limitações registradas

Os rate limits e limites de concorrência são process-local e precisam de Redis/API gateway antes de escala horizontal. O webhook de pagamento é uma fronteira genérica e depende de `PAYMENT_WEBHOOK_SECRET` e de um PSP PIX que envie os campos contratados; não é uma homologação de gateway, refund, chargeback ou reconciliação. O envio de e-mail depende de `EMAIL_WEBHOOK_URL` e `EMAIL_VERIFICATION_BASE_URL`; sem eles, a mudança fica pendente. O proxy de storage limita-se deliberadamente a `voice/<userId>/`; assets gerados exigem metadados de ownership antes de serem reabertos. Push deve evoluir para outbox transacional se a garantia de entrega for requisito comercial.

A aplicação ainda precisa de E2E versionado, testes HTTP de CORS/preflight, concorrência real e testes de contrato com PSP/e-mail antes de produção. Vulnerabilidades transitivas reportadas por `pnpm audit` devem ser triadas por cadeia de dependências, sem atualizações cegas da CLI Expo.
