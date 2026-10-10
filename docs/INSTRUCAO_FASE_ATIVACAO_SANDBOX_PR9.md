# Instrução técnica — Ativação do sandbox Expo Web no PR #9

**Fase:** reativação do ambiente de preview para validação mobile/web
**Projeto:** Pediu Mobile
**Branch:** `cursor/phase1-hybrid-ux-a9df`
**Head validado:** `9ed5e0d`

## Objetivo

Reativar o sandbox sem alterar o código funcional, garantindo que o preview Expo Web e a API local estejam servindo exatamente o head publicado no PR #9. A ativação deve ser reversível, não criar bypass de autenticação e não substituir dados reais por fixtures no cliente.

## Procedimento

1. Confirmar branch, commit e workspace limpo.
2. Reutilizar os serviços existentes quando as portas estiverem saudáveis: API na porta `3000` e Expo Web na porta `8081`.
3. Verificar `GET /api/health` e `GET /api/readyz` localmente e pela URL HTTPS temporária.
4. Confirmar resposta HTTP do Expo Web e presença do bundle Metro.
5. Abrir o preview nas rotas públicas necessárias; estados autenticados continuam dependendo de OAuth real.
6. Não executar migrações destrutivas, não alterar credenciais e não criar dados fictícios apenas para mascarar falhas de UI.

## Evidências da ativação

- Branch ativa: `cursor/phase1-hybrid-ux-a9df`.
- Head local/remoto: `9ed5e0d`.
- Workspace: limpo.
- API local: `/api/health` e `/api/readyz` respondendo com sucesso.
- Expo Web local: HTTP `200` na porta `8081`.
- API pública: `/api/health` e `/api/readyz` respondendo com sucesso.
- Expo Web público: HTTP `200` e bundle Metro disponível.
- Processos residentes confirmados: API/Metro ativos nas portas `3000` e `8081`.

## URLs de uso

- Preview Expo Web: https://8081-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer/
- API health: https://3000-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer/api/health
- API readiness: https://3000-i54sxpgl15gk7uuptg0z2-85761c05.us1.manus.computer/api/readyz
- PR #9: https://github.com/leonardoaranhaa/pediu-mobile/pull/9

## Critérios de encerramento

A fase fica operacional quando a branch/head estiverem alinhados, o workspace limpo, ambos os serviços responderem local e publicamente, e o preview puder ser aberto sem introduzir regressões ou contornar autenticação real. Alterações visuais ou funcionais posteriores devem abrir uma nova fase e repetir os gates apropriados.
