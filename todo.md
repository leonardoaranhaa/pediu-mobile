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

## Fora do escopo

Build EAS Android/iOS, submissão ou publicação no Google Play, configuração de PSP, OAuth ou novas credenciais externas não foram disparados.
