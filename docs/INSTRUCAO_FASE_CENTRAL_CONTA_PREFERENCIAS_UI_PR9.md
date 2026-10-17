# Instrução Técnica: Central de Conta e Preferências na Nova UI (PR #9)

## Objetivo
Reunir na nova experiência visual do Pediu todos os controles que já existiam na versão anterior, preservando os fluxos reais e a persistência por usuário:

- dados pessoais e sessão;
- temas do aplicativo;
- personalidade, animação e visibilidade do mascote;
- casa inteligente, localização, dicas, métricas e diagnóstico;
- preferências de notificações e histórico de avisos;
- endereços e localização de entrega;
- preferências de pagamento/PIX/cartão/dinheiro;
- consentimentos, exportação e solicitação de exclusão LGPD;
- suporte e assistente;
- atalhos operacionais de cliente, lojista e entregador.

## Princípios
1. **Paridade funcional**: nenhuma rota de conta existente será removida ou substituída por conteúdo mockado.
2. **Fonte de verdade**: identidade, notificações, pagamentos, endereços e privacidade continuam no backend/tRPC; o cliente só exibe e envia alterações validadas.
3. **Persistência**: o tema usa a preferência remota da conta quando autenticado; personalizações locais usam chaves separadas por usuário e visitante; notificações, pagamentos, endereços e consentimentos permanecem persistidos no servidor.
4. **Tema consistente**: componentes compartilhados e telas de conta não devem ficar presos às cores do tema clássico quando o usuário escolhe Onda local ou Pôr do sol.
5. **Mobile-first**: evitar overflow horizontal, usar `ScrollView` com safe area, linhas com texto flexível e feedback de toque.
6. **Acessibilidade**: controles de alternância devem comunicar valor, e ações destrutivas devem permanecer explicitamente identificadas.

## Escopo desta etapa
- Reorganizar `app/account/settings.tsx` como hub de preferências.
- Manter e expor diretamente o acesso a dados pessoais, notificações, endereços, pagamentos, privacidade, suporte e configurações avançadas.
- Harmonizar `Row`, `Field`, botões e `ToggleRow` com o tema atual em `components/pediu-page.tsx`.
- Atualizar as telas de notificações, pagamentos, endereços, dados pessoais e privacidade para utilizar os tokens do tema quando exibirem estados, bordas e mensagens.
- Preservar a personalização completa já existente em `ThemePicker` e `settings/advanced.tsx`.
- Adicionar testes unitários para a superfície esperada de preferências e normalização de personalização.

## Rotas de paridade

| Área | Rota | Persistência |
|---|---|---|
| Perfil | `/account/profile` | sessão OAuth / cache seguro |
| Dados pessoais | `/account/personal` | servidor |
| Central de preferências | `/account/settings` | tema + preferências locais/remotas |
| Tema e mascote | `/account/settings` → estúdio | tema remoto + customização por usuário |
| Preferências avançadas | `/account/settings/advanced` | customização por usuário/visitante |
| Notificações | `/account/notifications` | servidor |
| Endereços | `/account/addresses` | servidor |
| Pagamentos | `/account/payment-methods` | servidor |
| Privacidade | `/account/privacy` | servidor |
| Suporte | `/account/support-chat` | servidor |

## Validação obrigatória
1. `pnpm check`
2. `pnpm test`
3. `pnpm build`
4. `pnpm lint`
5. `git diff --check`
6. sincronização Git → WebDev com exclusões de segredos e artefatos;
7. `webdev_restart_server` e `webdev_check_status`;
8. health/readiness da API;
9. screenshots no preview gerenciado em `/account/profile`, `/account/settings`, `/account/settings/advanced`, `/account/notifications`, `/account/payment-methods` e `/account/privacy`;
10. teste de navegação sem sessão e teste autenticado quando a sessão estiver disponível;
11. checkpoint WebDev somente depois da bateria verde.

## Rollback
- O clone oficial continua sendo a fonte de verdade.
- O workspace WebDev pode retornar ao checkpoint anterior sem apagar dados remotos.
- Nenhuma migration ou credencial externa deve ser criada nesta etapa.
