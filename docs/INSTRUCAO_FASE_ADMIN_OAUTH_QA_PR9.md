# Instrução Técnica — Administrador OAuth de QA no WebDev

## Objetivo

Provisionar uma segunda identidade OAuth exclusiva para administração de QA no projeto WebDev `pediu-app`, usando `OWNER_OPEN_ID` como bootstrap server-side e aprovando o courier pelo painel administrativo oficial.

## Regras de segurança

- Não reutilizar a conta comercial/courier de QA como administradora.
- Não inserir `OWNER_OPEN_ID` no Git, no cliente, em `EXPO_PUBLIC_*` ou no chat.
- Não alterar `users.role`, `courier_profiles.status` ou `delivery_assignments` diretamente por SQL.
- Não criar cobrança, submissão de loja ou publicação externa.
- O identificador OAuth será obtido somente pelo fluxo de autenticação e configurado pelo secret manager do WebDev.
- A aprovação deverá usar `admin.courierReview`, gerando auditoria administrativa.

## Procedimento

1. Confirmar API/readiness e branch limpo.
2. Encerrar a sessão OAuth comercial atual no preview.
3. Abrir o login no preview HTTPS e autenticar uma segunda conta de QA, exclusiva para administração.
4. Obter o `openId` apenas pelo mecanismo interno de sessão/configuração, sem imprimir o valor.
5. Solicitar/configurar `OWNER_OPEN_ID` no WebDev como variável server-side.
6. Reiniciar os serviços gerenciados e repetir o login da conta admin para sincronizar o papel.
7. Abrir `/admin/couriers` e aprovar somente o perfil courier pendente de QA.
8. Confirmar no banco apenas os estados não sensíveis: papel `admin`, courier `approved`, `approvedAt` e auditoria `courier_approved`.
9. Voltar à sessão courier, ficar disponível e continuar a jornada do pedido #1.
10. Executar health/readiness, smoke do preview, testes focados e stress bounded antes do checkpoint.

## Critérios de aprovação

- A conta comercial continua sem acesso a `/admin/*`.
- A conta OAuth administrativa acessa `/admin/couriers`.
- A aprovação server-side é auditada.
- O courier aprovado recebe oferta apenas quando disponível e vinculado à loja.
- O pedido percorre `Preparando → Pronto → oferta → aceite → A caminho → Entregue`.
- Nenhum token, cookie, `openId` ou secret aparece em logs, arquivos ou resposta ao usuário.

## Rollback

Se houver erro, remover somente a configuração `OWNER_OPEN_ID` pelo secret manager, reiniciar o WebDev e manter o courier/pedido nos estados persistidos. Não apagar usuários ou pedidos sem autorização explícita.
