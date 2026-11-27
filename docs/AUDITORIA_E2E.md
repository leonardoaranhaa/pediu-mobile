# Auditoria de ponta a ponta · Pediu

Atualizado em 27/11/2026. Documento vivo: cada rodada de teste acrescenta achados aqui.

## Como o teste foi feito

- Código do build 17 (`3a01004`) mais o PR #13.
- Servidor do Pediu local, com Postgres próprio e descartável. Produção não foi tocada.
- App na versão web, em tamanho de Pixel 7, guiado pelo Playwright. Cada papel usa uma conta e uma sessão própria: lojista, entregador, conta master e cliente.
- Serviços externos reais só para CEP e mapa (BrasilAPI, ViaCEP, Nominatim).
- Limites: a versão web não testa câmera, notificação push, mapa nativo nem SecureStore. Isso fica para o celular.

Legenda de gravidade: **Alta** impede ou engana o usuário num fluxo principal. **Média** atrapalha ou confunde. **Baixa** é acabamento.

## Resumo

| Rodada | Escopo | Resultado |
|---|---|---|
| 1 | Fluxo feliz dos quatro papéis pela interface | Passou de ponta a ponta |
| 2 | Caminhos alternativos do pedido | 18 de 19; pedido mínimo não é aplicado |
| 3 | Permissões e segurança | Barreiras principais seguram; 2 falhas altas no código de entrega |
| 4 | PIX com simulador do Mercado Pago | Caminho principal funciona; estorno não é registrado, webhook repetido duplica alarmes |
| 5 | Código e lacunas de produto | 12 fragilidades e 25 itens faltando |

**Corrigir primeiro (alta gravidade):** E2E-01 avaliação inacessível · E2E-02 entregador não vê a corrida ao reabrir · E2E-15 pedido mínimo ignorado · S-01 código de entrega sem limite de tentativas · S-02 loja recebe o código de entrega · P-01 estorno não registrado · P-02 webhook repetido duplica "Novo pedido" · F-06 fotos em base64 no banco · F-07 rotinas de fundo dependem de agendador externo.

## Rodada 1 · Fluxo feliz dos quatro papéis

Resultado: **passou de ponta a ponta.** Loja criada e aprovada, entregador aprovado, pedido nº 1 em dinheiro (R$ 79,90), aceito, preparado, chamado, retirado, entregue com o código e avaliado. Código errado foi recusado corretamente.

### Falhas e inconsistências

| # | Gravidade | Onde | O que acontece | Situação |
|---|---|---|---|---|
| E2E-01 | Alta | Cliente · pós-entrega | Não existe caminho na interface até a avaliação (`/feedback/[orderId]`). O acompanhamento do pedido entregue não tem botão "Avaliar" e a notificação "Pedido entregue" abre o mapa (`/order/1/tracking-map`). A tela de avaliação funciona quando aberta pelo endereço. | Aberto |
| E2E-02 | Alta | Entregador · corrida em andamento | Ao reabrir o app com corrida ativa, a central abre na aba "Ofertas" com "Nenhuma corrida agora. Fique online…". A corrida fica escondida na aba "Corrida". | Aberto |
| E2E-03 | Média | Lojista · Pedidos | Depois de entregue, o pedido some da tela de Pedidos. Não há lista de entregues nem histórico do dia. | Aberto |
| E2E-04 | Média | Notificações | O entregador não recebe aviso quando é aprovado. A loja recebe "Loja aprovada". | Aberto |
| E2E-05 | Média | Notificações | "Novo pedido" para a loja aponta para `/order/track?orderId=…`, que é a tela do cliente, em vez da fila da loja. | Aberto |
| E2E-06 | Média | Cliente · acompanhamento | O horário de "A caminho" aparece durante a entrega e some depois que o pedido é entregue. "Aceito", "Em preparo" e "Pronto" nunca mostram horário. | Aberto |
| E2E-07 | Média | Loja · página pública | Botão "+" dentro do botão da linha do produto (`<button>` dentro de `<button>` na web, aviso de hidratação do React). | **Corrigido no PR #13** |
| E2E-08 | Baixa | Lojista · Entregas | O card diz "Entrega da sua loja" com a loja configurada como "Motoboy do Pediu". | Aberto |
| E2E-09 | Baixa | Lojista · painel | "Vendas" soma o pedido antes de a loja aceitar. Se a loja recusar, o número fica errado até atualizar. | A confirmar |
| E2E-10 | Baixa | Painel master · Pedidos | A lista mostra "Loja #1 · cliente #6" em vez dos nomes. | Aberto |
| E2E-11 | Baixa | Cliente · Pedido confirmado | Os botões "Acompanhar pedido" e "Voltar ao início" encostam nas bordas da tela. | Aberto |
| E2E-12 | Baixa | Cliente · avaliação | As estrelas não têm rótulo de acessibilidade. Leitor de tela não diz o que cada uma vale. | Aberto |
| E2E-13 | Baixa | Cadastro do entregador | O passo "Como você entrega" de `/register` nunca aparece: depois da conta, o app vai direto para a central (`/courier`), que repete o formulário. Há dois formulários para a mesma coisa. | Aberto |
| E2E-14 | Baixa | Home · pratos | Produto com preço R$ 0,00 aparecia em destaque, e a home recebe o preço já formatado como texto ("R$ 45,00"). | **Corrigido no PR #13** (filtro e leitura do preço) |

### Fragilidades vistas no console

| # | O que aparece | Por que importa |
|---|---|---|
| F-01 | `Query data cannot be undefined` em `pediu.stores.mine` e `pediu.courier.profile.mine` para quem não tem loja ou perfil. | O servidor devolve `undefined` em vez de `null`. O React Query trata como erro, e a tela pode piscar ou refazer a consulta. |
| F-02 | `play() failed because the user didn't interact` no painel da loja. | O alarme de novo pedido é bloqueado pelo navegador até o primeiro toque. No celular isso não acontece, mas na versão web o lojista pode não ouvir. |
| F-03 | `401` em `/api/auth/me` a cada abertura sem login. | Esperado, mas aparece como erro no console. Vale tratar como "sem sessão" sem registrar falha. |

## Rodada 2 · Caminhos alternativos do pedido (API como cada usuário)

Resultado: **18 de 19 verificações passaram.**

O que se comportou bem: total adulterado pelo cliente é recusado (o servidor recalcula); a mesma chave de idempotência gera um pedido só; cliente cancela pedido pendente e não cancela pedido em preparo; loja recusa pedido; loja não marca "Entregue" num pedido de entrega e não pula de "Pendente" para "Pronto"; troco menor que o total é recusado; loja fechada e loja pausada não recebem pedido; produto esgotado não entra; endereço a 360 km é recusado pelo raio de 10 km; mais de 50 unidades é recusado; entregador recusa oferta e o pedido continua "Pronto".

| # | Gravidade | Onde | O que acontece | Situação |
|---|---|---|---|---|
| E2E-15 | **Alta** | Pedido mínimo | O pedido mínimo configurado pela loja **não é aplicado** em lugar nenhum. Com mínimo de R$ 100,00, um pedido de R$ 44,00 foi aceito. `minOrder` só é usado para mostrar o rótulo na página da loja; nem `orders.create`, nem `checkout.quote`, nem a sacola conferem. | Aberto |
| E2E-16 | Média | Loja fechada | Com a loja marcada como fechada, o cliente recebe "A loja pausou os pedidos". Fechar e pausar são coisas diferentes para quem lê. | Aberto |
| E2E-17 | Média | Produto esgotado | A mensagem é "Há produto inválido ou de outro estabelecimento". Não diz qual produto acabou nem sugere tirar da sacola. | Aberto |
| E2E-18 | Baixa | Validação | Algumas recusas devolvem o erro técnico do Zod em inglês (`[ { "expected": ..., "message": "Too big..." } ]`), por exemplo quantidade acima de 50. A tela traduz parte dos casos, não todos. | Aberto |
| E2E-19 | Baixa | Endereço sem ponto | Pedido de entrega sem `addressId` recebe "Selecione um endereço salvo com localização para entrega", mesmo quando o problema é só o campo ausente. Texto aceitável, anotado para revisão de copy. | Aberto |

### Fragilidades de código vistas nesta rodada

| # | Onde | O que é | Risco |
|---|---|---|---|
| F-04 | `server/routers.ts` (`orders.get`, `orders.status` e outros) | Erros de regra lançados com `throw new Error(...)` em vez de `TRPCError` com código. O cliente recebe **HTTP 500 / INTERNAL_SERVER_ERROR** para "pedido não encontrado" ou "não autorizado". | Logs e alertas de erro de servidor ficam poluídos com erros de usuário; o app não consegue diferenciar "sem permissão" de "servidor caiu". |
| F-05 | `orders.create` | O app envia `total` e `unitPrice` de cada item; o servidor compara e recusa se não bater. Correto, mas qualquer mudança de preço entre abrir a sacola e confirmar vira "Total do pedido inválido" sem explicar que o preço mudou. | Pedido recusado sem motivo claro em horário de pico, quando a loja ajusta preço. |

## Rodada 3 · Permissões entre papéis e segurança da API

Contas usadas: dois clientes, duas lojas (Cantina E2E e Pizzaria Dois), dois entregadores (um aprovado, um não) e a conta master.

Resultado: **as barreiras principais seguram.** Sem login não se lê pedido; outro cliente não lê, não cancela e não usa endereço alheio; outra loja não lê, não aceita, não edita produto, não esgota produto e não fecha a Cantina; cliente não cria produto nem vira loja sozinho; só a conta master abre o painel master; entregador não aprovado não fica online; entregador sem a corrida não conclui entrega alheia; o entregador com a corrida **não** recebe o código de entrega; o login bloqueia depois de várias senhas erradas.

| # | Gravidade | Onde | O que acontece | Situação |
|---|---|---|---|---|
| S-01 | **Alta** | Código de entrega | Não há limite de tentativas em `experience.delivery.complete`. Um entregador com a corrida pode testar as 10.000 combinações de 4 dígitos por script e concluir sem ter visto o cliente. | Aberto |
| S-02 | **Alta** | Código de entrega | A lista de pedidos da loja (`orders.storeMine`, via `enrichOrdersForStore` em `server/db.ts`) devolve o `deliveryCode` do cliente. A tela não mostra, mas a resposta da API carrega. Com "motoboy da própria loja", a loja pode concluir entregas sem o cliente. | Aberto |
| S-03 | Média | Login | O limite de tentativas é por e-mail. Depois de 10 senhas erradas, **o dono da conta também fica bloqueado** por 15 minutos com a senha certa. Qualquer pessoa trava a conta de outra sabendo só o e-mail. | Aberto |
| S-04 | Média | Avaliações | O cliente avaliou a mesma loja duas vezes no mesmo pedido (notas 5 e 1) trocando só a chave de idempotência. Não há regra "uma avaliação por alvo por pedido". A média da loja pode ser manipulada. | Aberto |
| S-05 | Baixa | Código de entrega | `createDeliveryCode` usa `Math.random`, que não é próprio para segredo. E `deliveryCodesMatch` aceita **qualquer** código quando o pedido não tem código salvo. | Aberto |
| S-06 | Baixa | Ofertas | Um cliente chamando `courier.offers` recebe lista vazia (`[]`) em vez de "sem permissão". Não vaza dado, mas esconde uso indevido. | Aberto |

### Fragilidade de código reforçada

- **F-04 (ver rodada 2) se confirma em todas as recusas de permissão:** "não autorizado", "não encontrado" e "não pertence à sua loja" chegam como **HTTP 500**. Só o painel master responde 403 corretamente. Isso dificulta monitorar ataques (tudo parece falha de servidor) e o app não consegue mostrar a mensagem certa para cada caso.

## Rodada 4 · PIX com o simulador do Mercado Pago

Servidor local com `PIX_PROVIDER=mercado_pago` apontado para `scripts/mercado-pago-api-mock.ts` e webhook assinado com segredo de teste.

Resultado: **o caminho principal funciona.** Pedido PIX pela interface (nº 10, R$ 24,50) mostra "Aguardando pagamento" e o PIX copia e cola; a loja não vê o pedido antes do pagamento; webhook com assinatura falsa é recusado (401) e não muda nada; webhook legítimo aprova o pagamento e libera o pedido para a loja.

| # | Gravidade | Onde | O que acontece | Situação |
|---|---|---|---|---|
| P-01 | **Alta** | Estorno | Quando a loja recusa um pedido PIX já pago, o estorno é pedido ao Mercado Pago, mas **não é registrado**: `pediu_refunds` fica vazia e o pagamento continua `paid`. O cliente recebe "PIX estornado" mesmo assim. Não há como conciliar, mostrar no painel master ou saber se o estorno falhou. (`releaseProviderPixForOrder` em `server/pix-release.ts` ignora o retorno de `requestPixRefund`.) | Aberto |
| P-02 | **Alta** | Webhook repetido | Cada entrega do mesmo webhook gera de novo a notificação "Novo pedido" para a loja. Três entregas, três alarmes para um pedido só. O Mercado Pago reenvia webhooks com frequência. A resposta também diz `"duplicate": false` todas as vezes. | Aberto |
| P-03 | Média | Mensagem do estorno | O texto do aviso é "O pedido já estava cancelado. O valor do PIX foi estornado.", escrito para o caso de pagamento que chega depois do cancelamento. Na recusa pela loja ele não faz sentido, e é enviado antes de o estorno ser confirmado. | Aberto |
| P-04 | Média | Pagamento aprovado | O cliente não recebe aviso de que o PIX foi aprovado e o pedido foi para a loja. Só recebeu "PIX gerado". | Aberto |
| P-05 | Baixa | Webhook | O carimbo de tempo da assinatura não é conferido: um webhook assinado de 24 horas atrás foi aceito. O risco é baixo porque o servidor consulta o status real no Mercado Pago antes de agir, mas o padrão recomendado é recusar assinaturas antigas. | Aberto |
| P-06 | Média | Tela de pagamento PIX | A tela mostra o ícone de ✓ enquanto o pagamento ainda está pendente. E os botões fixos "Acompanhar pedido" e "Voltar ao início" cobrem o bloco "Pague com PIX": o QR e o copia e cola só aparecem rolando, e a ação principal da tela é "Acompanhar" em vez de "Copiar código PIX". Em tela pequena, o cliente pode não achar como pagar. | Aberto (confirmado no print) |

Não testado nesta rodada: PIX expirado (cobrança vencida sem pagamento), pagamento que chega depois do cancelamento pelo cliente, e conciliação diária (`payment_reconciliation_runs`).

## Rodada 5 · Fragilidades no código

Medido no código do build 17 mais o PR #13.

| # | Gravidade | O que é | Evidência | Risco |
|---|---|---|---|---|
| F-06 | **Alta** | Fotos guardadas como base64 dentro do Postgres e enviadas em toda listagem. | `imageData`, `logoData`, `deliveryPhoto` e `documentPhoto` são colunas `text` (`drizzle/schema.ts`). A busca da home com **3 produtos** devolve **443 KB**. Com 50 produtos, a home baixa vários MB a cada abertura e a cada atualização. | Home lenta no 4G, banco grande e caro, backup pesado. Documentos do entregador (CNH, selfie) ficam no mesmo banco das vendas. Precisa de armazenamento de arquivos (S3/R2/Supabase Storage) e URLs com miniatura. |
| F-07 | **Alta** | Rotinas de fundo dependem de alguém chamar um endereço. | Expiração de oferta, de PIX e de reserva de estoque, além do envio de push, rodam por `/api/internal/workers/tick` (`server/_core/index.ts`), que precisa de um agendador externo (`docs/HOSPEDAGEM.md`). O Render está no plano `free` (`render.yaml`), que **adormece** sem tráfego. | Se o agendador parar ou o servidor dormir, push não sai, ofertas não expiram e PIX vencido não libera estoque. O primeiro pedido depois do servidor dormir espera a máquina acordar. |
| F-08 | Alta | Arquivos gigantes concentrando regra e tela. | `server/db.ts` 6.494 linhas, `app/(tabs)/index.tsx` 6.167, `server/routers.ts` 2.577. | Qualquer ajuste mexe em arquivo enorme, com conflito de merge e regressão fácil. A home do cliente, o painel do lojista, os ajustes e o assistente de voz estão no mesmo arquivo. |
| F-09 | Média | Erros de regra como `Error` genérico. | 442 `throw new Error(` contra 44 `TRPCError` no servidor. | Ver F-04: tudo vira HTTP 500. |
| F-10 | Média | Destino da notificação decidido sem olhar o papel de quem recebe. | `server/push.ts`: todo aviso com `orderId` vai para `/order/track` (tela do cliente) ou `/order/…/tracking-map`. É a causa de E2E-05 (loja abre a tela do cliente) e parte de E2E-01 (entregue abre o mapa, não a avaliação). | Toque na notificação leva ao lugar errado para a loja e para o entregador. |
| F-11 | Média | Status do pedido gravado como texto em português. | `"Pendente"`, `"Aceito"`, `"Preparando"`, `"A caminho"`… no banco e espalhados em listas como `OPEN_ORDER_STATUSES`. | Uma mudança de texto quebra consultas e relatórios. O comum é guardar um código (`pending`, `accepted`) e traduzir na tela. |
| F-12 | Média | Dinheiro calculado com `Number` (ponto flutuante). | `Number(input.total)`, `Number(order.total)` e `Number(item.unitPrice)` nas contas do pedido; a comparação usa tolerância de R$ 0,01. | Em somas grandes, com cupom e gorjeta, aparecem diferenças de centavo. O padrão seguro é trabalhar em centavos inteiros, como `payments.ts` já faz no estorno. |
| F-13 | Média | Sem proteção contra tela quebrada. | Nenhum `ErrorBoundary` no app. | Um erro de JavaScript numa tela derruba o app inteiro para a tela branca, sem botão de "tentar de novo". |
| F-14 | Média | Sem monitoramento de erros no app. | Nenhum Sentry ou similar no app. O Expo Observe exige plano pago. | Erros no celular dos usuários ficam invisíveis. A auditoria só os encontra testando à mão. |
| F-15 | Baixa | "Tempo real" por consulta repetida. | 24 `refetchInterval` (chat a cada 5 s, painéis, corrida). | Funciona no piloto, mas gasta bateria e dados e multiplica chamadas ao servidor com mais usuários. Para escalar: WebSocket ou SSE nos pontos críticos (fila da loja, corrida, chat). |
| F-16 | Baixa | Sem detecção de conexão. | Nada de `NetInfo`. | Sem internet, o app mostra erros genéricos em vez de "você está sem conexão", e ações como confirmar o pedido podem ficar no ar sem aviso. |
| F-17 | Baixa | Testes de interface fora do CI. | Os 403 testes são de regra e servidor. Nenhum teste de tela roda no CI; os roteiros desta auditoria rodaram à mão. | Regressões visuais e de fluxo, como E2E-07, só aparecem testando à mão. |

## O que falta para um app de delivery como este

Itens que apps do mesmo tipo costumam ter e que não encontrei, ou encontrei pela metade. A ordem segue o impacto no piloto.

### Para operar o piloto com segurança
1. **Avaliação acessível depois da entrega** (E2E-01), com média visível na loja.
2. **Pedido mínimo valendo de verdade** (E2E-15).
3. **Estorno registrado e visível** no painel master, com status (P-01).
4. **Repasse para a loja e para o entregador.** Hoje é manual (STATUS.md). Falta pelo menos um extrato por período com o que cada um tem a receber e um botão "marcar como pago" no painel master.
5. **Histórico de pedidos da loja**, com os entregues e cancelados do dia e o total (E2E-03).
6. **Aviso sonoro e notificação confiáveis para a loja.** O pedido novo é o momento mais crítico, e hoje depende do agendador (F-07) e do navegador permitir som (F-02).
7. **Aceite dos Termos e da Política de Privacidade no cadastro.** Hoje o consentimento só existe na tela de privacidade, depois de a conta já existir (LGPD).

### Para o cliente confiar
8. **Status com horário em todas as etapas** e previsão de chegada atualizada (E2E-06).
9. **Mapa com a posição do entregador** na tela de acompanhamento (existe `/order/[id]/tracking-map`; vale conferir no celular).
10. **Reembolso e cancelamento explicados**, com prazo do estorno do PIX.
11. **Repetir pedido** a partir do histórico (existe no assistente, não na lista de pedidos).
12. **Fotos reais dos produtos** carregando rápido (F-06).

### Para o lojista
13. **Impressão ou resumo do pedido para a cozinha** (comanda).
14. **Tempo de preparo por pedido**, com alerta de atraso.
15. **Relatório de vendas por dia e por produto.**
16. **Horário de funcionamento com feriados e pausas programadas.**

### Para o entregador
17. **Abrir na corrida em andamento** (E2E-02).
18. **Extrato de ganhos por dia e semana**, com o que já foi pago.
19. **Botão de problema na entrega** (cliente não atende, endereço errado), com o pedido indo para o suporte.

### Para a conta master
20. **Nomes em vez de números** nas listas (E2E-10).
21. **Fila de estornos, repasses e documentos de entregador pendentes** num lugar só.
22. **Painel de saúde**: quando o agendador rodou pela última vez, a fila de push e os webhooks recebidos.

### Para crescer
23. **Nota fiscal**: não há emissão nem integração. Para lojas formais, isso vira exigência.
24. **Cartão pelo app.** Hoje é PIX, dinheiro ou cartão na entrega.
25. **Monitoramento de erros e testes de tela no CI** (F-14, F-17).
