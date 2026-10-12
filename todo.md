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
