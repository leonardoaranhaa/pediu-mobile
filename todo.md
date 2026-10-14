# TODO — Incorporação do PR #11 no PR #9

## Concluído

A incorporação do PR #11 foi concluída no branch `cursor/phase1-hybrid-ux-a9df`. O onboarding agora tem quatro etapas com swipe, indicadores clicáveis, mascote contextualizado, largura responsiva com fallback seguro, movimento reduzido respeitado, transições controladas e tokens de tema adequados.

Também foram concluídos os gates de qualidade no clone Git e no workspace WebDev: TypeScript, 56 arquivos de teste, 273 testes, build, lint e diff limpo. O smoke real confirmou `/api/health`, `/api/readyz`, banco, migrations, tabelas e rota `/onboarding`. O stress bounded concluiu 120 requisições de health com concorrência 12, e o preview público retornou HTTP 200.

## Estado entregue

- [x] PR #11 incorporado ao PR #9 sem conflitos.
- [x] Ajustes de responsividade, acessibilidade e movimento aplicados.
- [x] Conteúdo puro do onboarding extraído e coberto por testes.
- [x] Branch `cursor/phase1-hybrid-ux-a9df` publicado até `71242e3`.
- [x] Código sincronizado no projeto WebDev persistente `/home/ubuntu/pediu-app`.
- [x] API e Metro reiniciados pelo WebDev.
- [x] Smoke local e público concluído.
- [x] Stress bounded concluído.
- [x] Checks remotos do PR #9 verdes.
- [x] Checkpoint WebDev pendente somente desta operação final.

## Nova fase — Jornadas integradas

- [x] Instrução técnica criada para cliente, prestador e motoboy.
- [x] Teste vertical criado em `tests/journey-vertical.test.ts`.
- [x] Jornada automatizada: cliente cria → prestador aceita/prepara → prestador oferta → motoboy aceita → motoboy envia tracking → motoboy conclui → cliente avalia.
- [x] Suíte relacionada aprovada: 9 arquivos e 58 testes.
- [x] Matriz completa aprovada: 57 arquivos e 274 testes, TypeScript, build, lint e diff.
- [x] Smoke WebDev aprovado: home, prestador e motoboy HTTP 200.
- [x] API health/readiness aprovado com database, migrations e tabelas verdes.
- [x] Stress bounded aprovado: 120 requests de health com concorrência 12.
- [x] Preview público respondeu HTTP 200 e o PR #9 permaneceu com CI/Operational Validation verdes.
- [ ] Salvar o checkpoint WebDev desta fase.

## Fora do escopo

Build EAS Android/iOS, submissão ou publicação no Google Play, configuração de PSP, OAuth ou novas credenciais externas não foram disparados.

## Nova fase — Lapidação de UI e copy

- [x] Auditoria de textos técnicos, template e orientações de desenvolvimento expostos nas telas.
- [x] Rota de laboratório técnico de tema removida da superfície do produto.
- [x] Copy administrativa de pagamentos, MFA, login e créditos de anúncios corrigida para estados reais.
- [x] Teste de regressão criado em `tests/ui-copy.test.ts`.
- [ ] Rodar matriz completa, sincronizar WebDev, validar screenshots e salvar checkpoint.

## Nova fase — Catálogo, pedido e políticas

- [x] Instrução técnica criada para catálogo, busca, pedido, rastreamento, entrega e fiado.
- [x] Categorias locais, placeholders, contagem de itens e estado vazio do catálogo revisados.
- [x] Busca com atalhos locais, faixa de preço e estados vazios revisados.
- [x] Status/eventos do pedido traduzidos para copy amigável sem alterar valores persistidos.
- [x] Checkout passou a explicar taxa, prazo condicionado, retirada, Flash e Mercado.
- [x] Fiado passou a mostrar limite, saldo, disponível e regra de bloqueio.
- [ ] Rodar matriz completa, sincronizar WebDev, validar screenshots e salvar checkpoint.

## Nova fase — Cards de confirmação no checkout

- [x] Instrução técnica criada com as regras reais de prazo e cancelamento.
- [x] Copy pura criada para delivery padrão, Flash e retirada.
- [x] Card visual de prazo/recebimento adicionado ao checkout.
- [x] Card visual de cancelamento adicionado antes da confirmação.
- [x] Testes unitários criados para evitar ETA inventado e promessas indevidas.
- [ ] Rodar matriz completa, sincronizar WebDev, validar screenshot e salvar checkpoint.
