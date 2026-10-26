# Auditoria da beta fechada (APK v11 → v12)

Leonardo testou o APK v11 em celulares Android. Esta lista cobre os quatro problemas das fotos, o mascote torto e o restante do app revisado neste ciclo. Nada disso foi conferido de novo em um aparelho físico: o emulador desta máquina não sobe. A conferência foi no código e nos testes automáticos.

Não há migration nova. Os arquivos `drizzle/0004` a `drizzle/0009` não mudaram.

O `versionCode` do projeto passou para **12**. O EAS continua com `appVersionSource: remote` e `autoIncrement: true`. O próximo APK só sai como 12 se o contador remoto da Expo já estiver em 11 (o autoIncrement sobe 1) ou se alguém ajustar esse contador. O arquivo do projeto sozinho não manda no número do APK.

## Mascote — antes e depois

Antes, o personagem do canto da home (foto 3) era um monte de retângulos, orelhas, pés e textos empilhados. A reação “com fome”, que é a da home, girava só o corpo em **-70 graus** e deixava os pés, a antena e o brilho no lugar. O resultado era um desenho de lado, com partes sobrepostas e cortadas pela linha do cumprimento. O mesmo desenho era cortado no seletor de tema (`overflow: hidden`) e no encaixe de 82×82 do dock. A boca era um caractere de texto, então fonte grande estourava o rosto.

Depois, o mascote é **um SVG só**, caixa 88×104, largura e altura sempre na mesma proporção (`xMidYMid meet`). Não gira. Fome, sono, alegria e “tapando os olhos” mudam o rosto dentro do desenho. O balanço é só 3 px para cima e volta para zero. A home, o onboarding, o pedido confirmado, o seletor de tema e o dock usam esse mesmo componente. A splash continua sendo o ícone PNG do app, não esse personagem. Estados vazios usam texto, não o mascote composto.

## Achados

| # | Gravidade | Onde | Problema | Status |
| --- | --- | --- | --- | --- |
| 1 | Alta | Home, lojista, sheets (fotos 2, 3 e 4) | A faixa do relógio ficava preta. A tela pintava preto e só então empurrava o conteúdo. O perfil (foto 1) já pintava o creme por baixo dos ícones. | Corrigido. Fundo da janela e da home na cor do app, status bar transparente com ícones escuros, e a mesma regra nos sheets. |
| 2 | Alta | Abas, “Agora não”, checkout, carrinho, produto | A barra flutuante e os botões de baixo encostavam ou entravam nos botões do Android. | Corrigido. O espaço de baixo usa a área real do sistema, com folga. Se o Android não informar a barra de 3 botões, entra uma reserva de 48 dp mais 16 dp de folga. Gesto (~24 dp) também ganha folga. |
| 3 | Alta | Ajustes da loja (foto 4) e a outra tela de configurações | Campos preenchidos perdiam o nome. `0.00`, `10.00` e `14981104964` não diziam o que eram. O PIX não explicava para que serve. O raio parecia dinheiro. | Corrigido. Cada campo tem nome e uma frase de ajuda. Dinheiro em R$ com vírgula, telefone mascarado, raio em km, endereço com botão de mapa de 48 dp. |
| 4 | Alta | Home (foto 3) | Nomes viravam “TESTE Hiki …”. O endereço ia espremido numa linha. O texto do almoço era “Restaurantes lideram; Mercado Pediu continua à mão” e ainda “Mercado fica sempre a um toque.” | Corrigido. Nome da loja em até duas linhas. Endereço embaixo do bairro, em duas linhas. Texto curto: “Restaurantes primeiro. O mercado continua fácil de achar.” |
| 5 | Alta | Mascote da home, onboarding, tema, pedido confirmado, dock | Personagem torto, com partes soltas e cortadas. | Corrigido. Ver a seção do mascote acima. |
| 6 | Alta | Voltar do Android | No meio de um pedido ou de uma aba, o voltar podia fechar o app. O checkout saía sem perguntar. | Corrigido. Sheet aberto fecha primeiro. Aba que não é a inicial volta para o início. Checkout e o pedido em sheet pedem confirmação. Na home, pergunta antes de sair. |
| 7 | Alta | Registrar venda fiada | O lojista tinha que digitar um número interno de conta. O fiado podia ser lançado mesmo se a venda falhasse, e o saldo ficava errado. | Corrigido. A lista mostra o nome do cliente. O fiado só entra depois que a venda é salva. |
| 8 | Média | Teclado | Campos de baixo, o assistente e os sheets podiam ficar atrás do teclado. | Corrigido. Listas sobem com o teclado. O assistente reserva espaço embaixo. |
| 9 | Média | Clientes da loja | Nome, telefone e limite de fiado só existiam como dica que sumia ao digitar. | Corrigido. Rótulos, telefone mascarado e limite em R$. |
| 10 | Média | Stories e seletor de tema | O story encostava no relógio. O sheet de tema não respeitava a barra de baixo e cortava o mascote. | Corrigido. |
| 11 | Média | Erros na tela | Uma falha de banco podia aparecer como texto técnico. | Corrigido no servidor e de novo na tela. A pessoa vê “Não foi possível concluir agora. Tente de novo em instantes.” Mensagens normais, como “fora da área”, continuam. |
| 12 | Média | Acessibilidade | Voltar, sino, mapa e microfone do assistente não tinham nome. Alguns botões tinham menos de 44 dp. | Corrigido nos pontos citados. Botões principais já tinham 48–54 dp. |
| 13 | Baixa | Checkout | O título da tela dizia “Checkout”. | Corrigido para “Finalizar pedido” / “Pedido”. |
| 14 | Baixa | Pausar loja | Os botões de 15, 30 e 60 min eram baixos demais. | Corrigido para 48 dp na tela de configurações da loja. |

## O que foi olhado e não virou bug novo

- Visitante olha loja sem conta. Pedir, favoritar e acompanhar pedem conta. Continua assim.
- Uma conta continua com um papel só, escolhido no cadastro. Admin segue a exceção de sempre.
- O checkout já bloqueia o segundo toque enquanto envia e usa uma chave para não criar o pedido duas vezes.
- Carrinho vazio, produto inválido e produto carregando já tinham texto. A home e o catálogo da loja também.
- Splash e ícone são PNG únicos, não o mascote de peças. O problema torto não está neles.
- Estados vazios (carrinho, catálogo, ganhos do motoboy) são texto, não o mascote.

## Ainda aberto

| Gravidade | Item | Por quê ficou |
| --- | --- | --- |
| Média | Olhar a beta num celular de verdade, com navegação de 3 botões e de gesto, e com letra grande | Esta máquina não roda o emulador Android. |
| Média | O número 12 no APK publicado | O contador remoto do EAS é quem define o `versionCode` do arquivo instalado. |
| Baixa | Algumas telas de administração ainda têm frases em inglês, como “Support ticket not found” | Não entram no caminho de cliente, loja ou motoboy da beta. Os testes dependem dessas frases. |
| Baixa | Conferir a splash no aparelho | É um PNG separado. Não foi redesenhada neste ciclo. |
| Baixa | Letra bem grande em todas as telas | O mascote não estica com a fonte. Outros textos longos ainda podem cortar com reticências em telas de 360 dp. Não houve passagem visual tela a tela nesse tamanho. |
