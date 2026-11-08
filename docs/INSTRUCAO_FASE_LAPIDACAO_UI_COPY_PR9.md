# Instrução Técnica — Lapidação de UI e copy do Pediu

## Objetivo

Remover superfícies e textos de desenvolvimento que chegaram ao usuário final, corrigir orientações operacionais imprecisas e fazer uma primeira rodada de polimento visual sem alterar os contratos reais de delivery, pagamentos, estoque, courier, Mercado, Flash, Club ou OAuth.

## Escopo desta fase

1. Auditar rotas `app/`, componentes compartilhados e textos visíveis.
2. Retirar o laboratório técnico de tema da superfície navegável do produto.
3. Substituir copy administrativa que promete recurso futuro sem ação disponível por texto operacional preciso.
4. Corrigir mensagens de capacidade futura que podem soar como instrução ao desenvolvedor ou promessa comercial.
5. Preservar o fluxo real: o servidor continua fonte de verdade; nenhum mock, seed, alteração de schema ou bypass de autorização será introduzido.
6. Validar TypeScript, testes, build, lint, preview WebDev, rotas críticas e ausência dos textos proibidos.

## Critérios de UX

- Textos voltados ao usuário devem estar em português claro e explicar o próximo passo.
- Estados pendentes devem distinguir `em análise`, `indisponível`, `não configurado` e `não suportado`.
- A interface não deve exibir termos de framework, tokens de design, contagem de presses ou instruções para editar arquivos.
- Recursos financeiros não devem ser descritos como disponíveis quando ainda dependem de política, PSP ou CNPJ.
- O preview WebDev continua sendo QA; não substitui EAS/Play.

## Validação e rollback

Rodar `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` e `git diff --check`; sincronizar o clone para `/home/ubuntu/pediu-app`, reiniciar o WebDev e conferir rotas com screenshot/HTTP. Se houver regressão, reverter o commit da fase e restaurar o checkpoint anterior.
