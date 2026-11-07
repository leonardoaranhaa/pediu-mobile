# Pediu · Status do projeto

Atualizado em 07/11/2026.

## Desafio 90 dias

- Início: 02/11/2026. Fim: 31/01/2027.
- Cada semana tem uma entrega fechada. Fechada quer dizer que funciona e tem print ou vídeo curto.
- Se uma semana terminar sem entrega, é sinal de alerta, não fracasso. A semana seguinte fica com metade do escopo.
- Este arquivo é atualizado a cada entrega.
- Fase atual: polimento e validação, não construção. O Pediu é um app próprio e independente. Apps de delivery consolidados (como o 99Food) servem só como referência visual e de estrutura para polir as telas que já existem.

## Feito (até a versão 12 do app)

- App Android, versão 12 (APK de 01/11/2026). Servidor no ar em https://pediu-mobile.onrender.com.
- Cadastro e login com e-mail e senha. Cada conta escolhe um papel: cliente, lojista ou motoboy. Existe também a conta master (administração).
- Cliente: vê lojas sem login, abre o cardápio, monta o carrinho, faz o checkout e acompanha o pedido.
- Pagamento: PIX pelo Mercado Pago (conta de produção), dinheiro com troco e cartão na entrega.
- Lojista: painel com pedidos, aceite com contagem, cardápio, arquivar produto, horário, pausa, venda e fiado.
- Motoboy: cadastro com documentos, ficar online, oferta de entrega, código de entrega e ganhos.
- Conta master: painel com usuários, lojas, pedidos, pagamentos, suporte e auditoria.
- Assistente com IA (OpenAI) para os quatro perfis. Ações com dinheiro pedem confirmação.
- Auditoria da beta com 48 correções (ver docs/beta-audit.md).
- Testes automáticos cobrem mercado, fast food, estoque, tamanho, PIX pendente escondido da loja e o código de entrega. Isso não é um PIX pago de verdade em produção. Na base de produção havia 4 pedidos: 2 entregues em dinheiro, 1 PIX real cancelado e nenhum PIX pago.
- O item Entregadores está no código do painel (ainda não está no APK v12 instalado). O motoboy em análise vê a situação e pode atualizar. A aprovação continua manual.

## Em andamento

- Semana 1 do desafio (ver "Próxima entrega"). Falta loja real, motoboy aprovado no celular e o primeiro pedido real.

## Bloqueios

1. O APK instalado ainda é o v12, de antes do atalho Entregadores. No código o caminho já existe, mas o celular só ganha isso numa compilação nova. O motoboy cadastrado em 01/11 segue em análise até alguém aprovar.
2. Não existe loja real pronta. A "Delicia de Avaí" está fechada, sem produtos, sem endereço e sem chave PIX. A outra loja é de teste.
3. Nenhum PIX de produção foi pago até aqui. O que foi dito sobre o servidor de teste não conta como prova desse pagamento real. O primeiro pedido pago continua sendo a entrega da Semana 1.
4. O dinheiro do PIX cai na conta Mercado Pago do Pediu. O repasse para a loja ainda não é automático. Na beta, ele vai ser feito à mão. Este passe não cria repasse automático.
5. Faltam testes em celular de verdade: navegação por gestos e letra grande.
6. Pequenos: frases em inglês nas telas de administração e a tela de abertura (splash).

## Próxima entrega: Semana 1 (02/11 a 08/11/2026)

**Configuração real e primeiro pedido real.** Os testes automáticos cobrem o caminho. O PIX pago de produção ainda não aconteceu.

Escopo fechado (escopo aprovado pelo Leonardo em 03/11/2026):

1. Configurar 1 loja REAL: endereço, horário, chave PIX e pelo menos 3 produtos com foto e preço.
2. Aprovar 1 entregador REAL pelo app. O item "Entregadores" já está no código do painel. Falta a versão nova do app no celular.
3. Fazer 1 pedido real com PIX pago, de ponta a ponta, usando a loja e o entregador reais:
   cliente pede → paga PIX → loja aceita → loja marca pronto → entregador aceita → entrega com o código → pedido "Entregue".

Critérios de pronto (todos precisam estar ok):

- [ ] Loja real aberta no app, com endereço, horário, chave PIX e 3 produtos ou mais com foto e preço.
- [ ] Entregador real aprovado pelo Painel do Pediu.
- [ ] O pedido real aparece como "Entregue" e o pagamento como "pago" no Painel do Pediu.
- [ ] Prints das telas principais: loja, carrinho, PIX pago, pedido na loja, entrega no entregador, "Entregue".
- [ ] Vídeo curto (até 1 minuto) mostrando o pedido sendo feito.
- [ ] Lista dos bugs vistos no caminho, anotada aqui.

Fora do escopo desta semana: painel no computador, repasse automático, novas telas.

## Plano semanal (semanas 2 a 12)

O núcleo (login, lista de lojas, cardápio, carrinho, checkout com PIX, painel do lojista e do entregador) já existe e foi testado. Por isso as semanas 2 a 4 não refazem esse trabalho. Elas corrigem o que o pedido real da Semana 1 mostrar e preparam a primeira loja de verdade.

| Semana | Datas | Entrega fechada |
| --- | --- | --- |
| 1 | 02/11 a 08/11 | Loja real configurada, entregador real aprovado e primeiro pedido real com PIX pago (ver acima). |
| 2 | 09/11 a 15/11 | Correções da Semana 1 e passada em celular real (gestos e letra grande). Nova versão do app. |
| 3 | 16/11 a 22/11 | Primeira loja real de Bauru cadastrada, com cardápio completo e aberta no app. |
| 4 | 23/11 a 29/11 | Repasse da loja: relatório semanal no Painel do Pediu com quanto cada loja vendeu, a comissão e quanto repassar. Primeiro repasse feito à mão. |
| 5 | 30/11 a 06/12 | Termos de uso, política de privacidade e tela de ajuda revisados. Textos em inglês removidos do admin. Splash nova. |
| 6 | 07/12 a 13/12 | Polimento visual das telas existentes com base nas referências do Leonardo (cores, tom, cards) e link do cardápio da loja para mandar no WhatsApp. |
| 7 | 14/12 a 20/12 | Segunda e terceira lojas reais cadastradas. 2 motoboys aprovados. |
| 8 | 21/12 a 27/12 | Primeiro cliente real (não da família) faz um pedido pago. |
| 9 | 28/12 a 03/01 | Beta aberta para amigos e família: 5 pessoas com o app instalado. Formulário de opinião. |
| 10 | 04/01 a 10/01 | Divulgação local em Bauru (Instagram e grupos). Meta: 5 usuários ativos (pelo menos 1 pedido cada). |
| 11 | 11/01 a 17/01 | Correções das opiniões da beta. Nova versão. |
| 12 | 18/01 a 31/01 | Fechamento: números da beta (pedidos, lojas, usuários), lista do que falta e decisão do próximo passo. |

## Extras opcionais (fora do núcleo)

- Ver no painel do lojista os pedidos que a loja recebe por outros apps (por exemplo, pela API 99Food Open Platform). É periférico e só entra se sobrar tempo depois da beta.

## Histórico de entregas

| Semana | Resultado | Observação |
| --- | --- | --- |
| 1 | Em andamento | Em 07/11 o código ganhou atualização do motoboy em análise e pedido de senha honesto. Ainda falta APK novo, loja real e PIX pago de verdade. |
