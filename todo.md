# TODO — Incorporação do PR #11 no PR #9

## Concluído
- [x] Auditar o PR #11 e comparar sua base com o avanço do PR #9.
- [x] Testar merge temporário do PR #11 sobre o PR #9 sem conflitos.
- [x] Incorporar os dois commits do PR #11 no branch `cursor/phase1-hybrid-ux-a9df`.
- [x] Trocar `Dimensions.get("window")` por `useWindowDimensions()`.
- [x] Fazer o onboarding respeitar `motionEnabled` e movimento reduzido.
- [x] Trocar springs por transições `timing` controladas.
- [x] Usar `theme.line` no indicador de progresso.
- [x] Extrair e testar o conteúdo das quatro etapas do onboarding.

## Em validação
- [ ] Rodar `pnpm check`.
- [ ] Rodar `pnpm test`.
- [ ] Rodar `pnpm build`.
- [ ] Rodar `pnpm lint`.
- [ ] Rodar `git diff --check`.
- [ ] Fazer smoke real da API e readiness.
- [ ] Sincronizar o clone Git com o workspace WebDev.
- [ ] Reiniciar e validar o WebDev persistente.
- [ ] Testar onboarding em preview web com swipe, dots, pular e começar.
- [ ] Salvar checkpoint WebDev após todos os gates verdes.
- [ ] Enviar o branch atualizado do PR #9.

## Fora do escopo
- Build EAS Android/iOS.
- Submissão ou publicação no Google Play.
- Configuração de PSP, OAuth ou novas credenciais.
