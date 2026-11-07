# Instrução Técnica — OAuth real e jornada persistida no WebDev

## Objetivo
Validar a jornada de entrega usando autenticação OAuth real no projeto WebDev persistente `/home/ubuntu/pediu-app`, com usuários sincronizados no banco do ambiente e sessão HttpOnly no preview web.

## Pré-condições

- Projeto WebDev ativo: `pediu-app`.
- API e Metro gerenciados pelo WebDev.
- `DATABASE_URL` configurada no ambiente e readiness verde.
- `EXPO_PUBLIC_OAUTH_PORTAL_URL` e `EXPO_PUBLIC_APP_ID` configurados via secrets/env do WebDev; nunca em Git ou em mensagem.
- Origem/redirect OAuth autorizada pelo provedor para o preview HTTPS do WebDev.
- O usuário realizará o login no navegador quando o provedor exigir interação, MFA ou consentimento.

## Separação de configuração

| Categoria | Configuração | Local permitido |
| --- | --- | --- |
| Cliente público | `EXPO_PUBLIC_OAUTH_PORTAL_URL`, `EXPO_PUBLIC_OAUTH_SERVER_URL`, `EXPO_PUBLIC_APP_ID`, `EXPO_PUBLIC_API_BASE_URL` | Ambiente WebDev; valores públicos podem ser incorporados ao bundle |
| Servidor | `OAUTH_SERVER_URL`, `JWT_SECRET`, `OWNER_OPEN_ID`, `ALLOWED_ORIGINS` | Secrets do WebDev; nunca no cliente |
| Banco | `DATABASE_URL` | Secret do WebDev |

Tokens OAuth, cookies, JWT, códigos de autorização e credenciais de usuário não serão registrados nem copiados para arquivos.

## Metodologia de validação

1. Verificar a configuração por presença, sem imprimir valores sensíveis.
2. Confirmar `/api/health`, `/api/readyz` e estado inicial `GET /api/auth/me` como não autenticado.
3. Abrir o login no preview HTTPS e completar OAuth com uma conta de teste autorizada.
4. Confirmar retorno ao preview e `GET /api/auth/me` com cookie HttpOnly.
5. Confirmar que o usuário foi criado/atualizado no banco pelo `openId` do provedor, sem duplicidade em novo login.
6. Criar ou usar uma loja/produto com conta persistida de prestador.
7. Validar cliente autenticado criando pedido delivery.
8. Validar prestador autenticado aceitando/preparando o pedido e criando oferta.
9. Validar motoboy autenticado aprovado aceitando a oferta, enviando localização e concluindo.
10. Validar consulta de tracking e avaliação pelo cliente autenticado.
11. Validar isolamento: cliente não opera loja, prestador não lê pedido alheio e motoboy não aceita oferta de outro usuário.
12. Fazer logout, confirmar `401` em `/api/auth/me`, repetir login e confirmar a mesma identidade persistida.

## Critérios de aprovação

- OAuth conclui sem expor `code`, `state`, token ou credenciais na URL final.
- A sessão web usa cookie HttpOnly/SameSite conforme a origem configurada.
- O mesmo `openId` retorna o mesmo usuário persistido após logout/login.
- A jornada de entrega passa entre os três atores reais, com autorização server-side.
- Health/readiness, migrations, testes focados, matriz de qualidade e stress bounded permanecem verdes.

## Bloqueios legítimos

Se o portal OAuth, `APP_ID`, redirect autorizado ou conta de teste não estiverem configurados, parar antes de tentar login. Solicitar ao usuário a configuração segura no WebDev; não pedir tokens, senhas ou códigos por chat. Nenhum usuário comercial real, pagamento, publicação, EAS ou Play será acionado.

## Resultado da validação em 2026-10-14

- OAuth real concluído no preview HTTPS após a verificação humana do provedor; a conta retornou ao Pediu e exibiu a identidade persistida `Leonardo Aranha`.
- Perfil, pedidos, loja e catálogo foram acessados com a sessão autenticada; a API permaneceu saudável e o acesso anônimo continuou retornando `401`.
- Foi criada, com autorização explícita, a loja de QA `Pediu QA Teste`, o produto temporário `Combo QA Delivery` por R$ 35,00 e o endereço padrão `Casa QA` com coordenadas do ambiente de teste.
- O pedido QA `#1` foi criado sem cobrança PIX, usando pagamento em dinheiro (`pediu_payments.status = pending`), e a cotação server-side confirmou subtotal/total de R$ 35,00 e entrega R$ 0,00.
- A jornada cliente → prestador avançou por `Pendente` → `Aceito` → `Preparando`.
- O cadastro do mesmo usuário como courier de QA foi enviado e ficou `pending`, conforme a regra de aprovação; não há usuário administrador provisionado no banco (`0` admins), portanto a aprovação não foi contornada por SQL.

### Próximo passo bloqueado

Para completar `Pronto` → oferta → aceite → localização → `A caminho` → `Entregue`, é necessário aprovar o perfil courier por uma sessão administrativa legítima ou provisionar um administrador de QA pelo fluxo seguro. Não aprovar automaticamente o próprio courier nem criar atribuição diretamente no banco.

## Rollback

A fase não altera schema nem código de domínio. Em caso de falha, remover/desabilitar somente as configurações OAuth no ambiente WebDev e voltar ao checkpoint anterior; não apagar usuários persistidos nem alterar dados comerciais sem autorização explícita.
