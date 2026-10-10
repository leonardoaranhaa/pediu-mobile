# TODO — Transições de tema e mascote (PR #9)

## Em andamento
- [ ] Expor modo claro/escuro na central de personalização.
- [ ] Persistir modo de aparência localmente com chave segura e sem segredo.
- [ ] Adicionar crossfade global ao trocar modo claro/escuro.
- [ ] Derivar variantes dark das paletas Pediu sem quebrar os tokens existentes.
- [ ] Animar a troca das paletas Pediu.
- [ ] Animar a troca de estilo do mascote respeitando `motionEnabled`.

## Validação
- [ ] `pnpm check`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `git diff --check`
- [ ] Sincronizar clone Git → workspace WebDev.
- [ ] Reiniciar e validar status do WebDev.
- [ ] Validar `/api/health` e `/api/readyz`.
- [ ] Capturar preview claro/escuro e estilos do mascote.
- [ ] Salvar checkpoint WebDev após todos os gates.

## Concluído nesta fase
- [ ] Commit e push no branch `cursor/phase1-hybrid-ux-a9df`.
