# Pediu · Status do projeto

Atualizado em 02/11/2026.

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
- Testes feitos até agora: 2 pedidos entregues e pagos em dinheiro, todos de teste. Nenhum PIX foi pago de verdade ainda.

## Em andamento

- Semana 1 do desafio (ver "Próxima entrega").

## Bloqueios

1. A tela de aprovar motoboy existe, mas nenhum botão do Painel do Pediu leva até ela. Hoje não dá para aprovar um motoboy pelo app. O motoboy cadastrado em 01/11 está "em análise".
2. Não existe loja real pronta. A "Delicia de Avaí" está fechada, sem produtos, sem endereço e sem chave PIX. A outra loja é de teste.
3. O PIX nunca foi pago de ponta a ponta em produção. O único PIX gerado foi cancelado.
4. O dinheiro do PIX cai na conta Mercado Pago do Pediu. O repasse para a loja ainda não é automático. Na beta, ele vai ser feito à mão.
5. Faltam testes em celular de verdade: navegação por gestos e letra grande.
6. Pequenos: frases em inglês nas telas de administração e a tela de abertura (splash).

## Próxima entrega: Semana 1 (02/11 a 08/11/2026)

**Um pedido real, do começo ao fim, com celulares de verdade e PIX pago.**

Escopo fechado:

1. Colocar o item "Entregadores" no Painel do Pediu (aprovar e rejeitar pelo app).
2. Aprovar 1 motoboy real pelo app.
3. Deixar 1 loja pronta: endereço, horário, chave PIX e pelo menos 3 produtos com foto e preço. Pode ser a "Delicia de Avaí" ou a loja de um amigo.
4. Fazer 1 pedido de verdade com 3 celulares (cliente, loja e motoboy):
   cliente pede → paga PIX de verdade (valor baixo) → loja aceita → loja marca pronto → motoboy aceita → motoboy entrega com o código → pedido "Entregue".

Critérios de pronto (todos precisam estar ok):

- [ ] O pedido aparece como "Entregue" e o pagamento como "pago" no Painel do Pediu.
- [ ] O PIX aparece pago no Mercado Pago.
- [ ] Prints das telas principais: loja, carrinho, PIX pago, pedido na loja, entrega no motoboy, "Entregue".
- [ ] Vídeo curto (até 1 minuto) mostrando o pedido sendo feito.
- [ ] Lista dos bugs vistos no caminho, anotada aqui.

Fora do escopo desta semana: painel no computador, repasse automático, novas telas.

## Plano semanal (semanas 2 a 12)

O núcleo (login, lista de lojas, cardápio, carrinho, checkout com PIX, painel do lojista e do entregador) já existe e foi testado. Por isso as semanas 2 a 4 não refazem esse trabalho. Elas corrigem o que o pedido real da Semana 1 mostrar e preparam a primeira loja de verdade.

| Semana | Datas | Entrega fechada |
| --- | --- | --- |
| 1 | 02/11 a 08/11 | Um pedido real de ponta a ponta com PIX pago (ver acima). |
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
| 1 | Em andamento | |
