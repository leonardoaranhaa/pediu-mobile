# Instrução Técnica — Auditoria completa de prontidão Go Live público do PR #9

## Objetivo

Avaliar o branch `cursor/phase1-hybrid-ux-a9df` como produto de delivery destinado ao público, distinguindo o que está funcional e validado no código do que ainda depende de infraestrutura, credenciais, PSP, operação humana ou homologação externa.

## Escopo da revisão

A auditoria seguirá duas etapas:

1. **Conformidade com o produto**: onboarding, autenticação, cliente, lojista, entregador, marketplace/Mercado, carrinho, cotação, checkout, pagamentos, pedidos, tracking, avaliações, suporte, conta/privacidade e configurações.
2. **Qualidade para produção**: autorização, validação de entradas, SQL/ORM, idempotência, concorrência, migrations, webhooks, segredos, CORS/CSRF, rate limits, logs, observabilidade, performance, testes, CI/CD, WebDev persistente e preparação EAS/Play.

## Método

- Revisar `README.md`, `docs/APP_ARCHITECTURE.md`, máquina de estados e matriz de implementação.
- Inspecionar rotas, procedures tRPC, domínio, schema/migrations e telas de cada papel.
- Procurar padrões de risco: autenticação ausente, autorização por ID, confiança em valores do cliente, queries dentro de loops, estados impossíveis, retries não idempotentes, segredos expostos e limites locais incompatíveis com escala.
- Executar gates locais (`check`, `test`, `build`, `lint`, `diff --check`) e validar health/readiness no WebDev persistente.
- Classificar cada achado como **P0 bloqueador**, **P1 importante**, **P2 melhoria** ou **externo pendente**, com arquivo/linha, impacto, evidência e correção recomendada.

## Critério de Go Live

O produto só pode ser classificado como pronto para público quando não houver P0/P1 técnico ou de segurança aberto e quando os bloqueios externos estiverem explicitamente aceitos: PSP/PIX homologado, refunds/chargebacks/reconciliação, OAuth/URLs estáveis, domínio/TLS, observabilidade, backups, política LGPD, credenciais EAS/Play e operação de courier.

A existência de testes verdes ou de um preview WebDev não será tratada como prova de produção comercial.

## Entregáveis

- Relatório Markdown completo com resumo executivo, evidências, severidade, matriz por domínio, pontos positivos, perguntas e veredito.
- Checklist `todo.md` atualizado.
- Nenhuma alteração de produto será feita automaticamente durante a auditoria, salvo correção P0 explicitamente autorizada em uma fase posterior.
