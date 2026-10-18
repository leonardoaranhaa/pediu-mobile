# O que é de verdade e o que é de mentira no Pediu

Relatório para o dono do Pediu. Linguagem simples. Data: 18 de outubro de 2026.

Isto olha o aplicativo que o Leonardo testou no celular Android: APK versão 3, commit `761e62a`. Nada desta lista foi construído agora. É só o mapa do que já funciona, do que engana, e do que fazer em seguida.

## Como ler

- **Real:** a pessoa faz a ação e o resultado fica gravado no servidor. Outra pessoa, em outro celular, vê o mesmo resultado.
- **Parcial:** o caminho existe, mas falta um pedaço, uma chave, ou a tela mente em algum detalhe.
- **Mock:** texto, desenho ou atalho que não faz o que promete. Também entra aqui o que ainda não existe e a tela finge que existe.

---

## 1. Cada função, papel por papel

### Cliente

| Função | Situação | O que acontece de verdade |
| --- | --- | --- |
| Olhar lojas e cardápio sem criar conta | Real | A vitrine abre. Dá para ver produto e preço. |
| Introdução, botão Pular | Real | Pular abre a vitrine e a introdução não volta. |
| Buscar “pizza” | Real | O filtro de preço vazio não esconde mais o resultado. |
| Página do produto, foto e adicionais | Real | Foto e opções vêm do cardápio da loja. Loja fechada não deixa pedir. |
| Carrinho | Real | O item entra e o total soma. Dois adicionais do mesmo produto ainda viram um item só. |
| Fechar o pedido (cotação) | Real | O servidor recalcula produto, taxa e total. |
| Pagar em dinheiro e pedir troco | Real | O troco fica no pedido. O motoboy confirma que recebeu. |
| Meus pedidos | Real | Mostra número, valor e nome da loja. |
| Pedido cancelado porque a loja não aceitou | Real | A tela diz o motivo. A loja também é avisada. |
| Código de 4 números na entrega | Real | O cliente mostra o código. Código errado é recusado. |
| Criar conta de cliente | Real | Nome, e-mail, telefone e senha. |
| Dados pessoais e trocar senha | Real | Grava na conta. |
| Falar com o suporte | Real | Abre um chamado e a equipe responde no painel. |
| Pontos do clube | Real | Os pontos entram quando a entrega é concluída. |
| Avisos dentro do aplicativo | Real | A lista de avisos da conta existe e marca como lido. |
| Endereço digitado e pino no mapa | Parcial | O mapa é de graça (OpenStreetMap). O GPS do celular às vezes falha e o app tenta de novo por outro caminho. |
| Mapa acompanhando a entrega | Parcial | Desenha loja, motoboy e destino quando existem coordenadas. Não é o Google Maps dentro do app. |
| PIX na hora de pagar | Parcial | O código PIX só nasce se o servidor tiver a chave do Mercado Pago. Sem a chave, o PIX não sai. |
| Cupom | Parcial | O desconto funciona se o cupom existir no banco. Não há uma fábrica de cupons para o lojista. |
| Chat do pedido | Parcial | Cliente e loja conseguem escrever, mas o acompanhamento quase não mostra o caminho. |
| Fiado para o cliente | Parcial | A loja controla limite e saldo. O cliente não tem uma carteira clara de fiado. |
| Aviso no celular com o app fechado | Parcial | Sai um aviso quando o pedido é criado, se o celular autorizou. Não fica repetindo. |
| Assistente “Peça do seu jeito” | Parcial | Os atalhos abrem busca, pedidos e suporte sem inteligência. Texto e voz só entendem a frase se o servidor tiver a chave de IA. No APK testado essa chave não é a do Leonardo. Ver seção 5. |
| Mascote | Parcial | Ele desenha e se mexe, mas invade o carrossel, a barra e a borda da tela. Ver seção 2. |
| Carrossel, inclusive “Sabor do momento” | Parcial | Um cartão usa o primeiro produto de verdade. Os outros são frases prontas e fotos de enfeite (pizza, açaí, hambúrguer). |
| Selo Flash e prazo “rápido” | Parcial | O selo Flash é de verdade. O “até 25 min” não é a conta daquela entrega. |
| Distância “perto de você” | Mock | Não mede a distância. É um texto fixo em todo card. |
| Lugar chamado “Casa” | Mock | Se a pessoa nunca salvou endereço, o topo ainda diz “Casa”. |
| Fotos grandes de comida na abertura | Mock | São imagens de decoração, não a foto do produto da loja. |
| Verificação em duas etapas | Mock | A tela diz que ainda não existe. |
| “Esqueci a senha” por e-mail | Mock | O app não envia e-mail. Só um código que o administrador vê no painel. |
| Pedido em grupo | Mock | O painel avisa que não está liberado. Não há tela de grupo. |

### Lojista

| Função | Situação | O que acontece de verdade |
| --- | --- | --- |
| Cadastrar a loja com endereço e pino | Real | Grava nome, telefone, endereço e ponto no mapa. |
| Horário por dia da semana | Real | Loja fechada continua na lista, com “Fechado” e a próxima abertura. |
| Produto com foto e adicionais | Real | A foto fica no banco (não numa nuvem de imagens). Dá para ligar e desligar o item. |
| Aceitar, preparar e marcar pronto | Real | O status muda e o cliente vê. |
| Venda no relatório depois da entrega | Real | Pedido entregue entra nas vendas, inclusive dinheiro. |
| Fiado da loja (limite, saldo, bloqueio) | Real | Fica no banco daquela loja. |
| Ajustes: raio, retirada, taxa, chave PIX da loja | Real | Dá para salvar depois, na tela de ajustes, não no primeiro cadastro. |
| Chamar motoboys por perto | Real | Oferece a corrida a motoboys aprovados e online, num raio de 8 km, sem pedir o número da conta deles. |
| Compartilhar o cardápio | Real | Manda uma lista em texto. Não manda a foto do anúncio. |
| Alarme de pedido novo | Parcial | Toca e vibra enquanto o app da loja está aberto. Com o app fechado, só um aviso. |
| Anúncio com imagem | Parcial | O programa sabe gerar texto e imagem e publicar no Explorar. No ar, isso depende de uma chave interna que o Leonardo não possui. Os 3 créditos são um presente, não uma compra. Ver seção 5. |
| Assistente da loja | Parcial | Igual ao do cliente: atalho funciona; entender frase livre depende da mesma chave. |
| Chamar um motoboy já da equipe | Parcial | O caminho antigo ainda existe, ao lado do chamado da cidade. |
| Modo loja e modo cliente no mesmo app | Parcial | O app lembra o último modo. Uma conta de loja continua caindo na vitrine de cliente e no perfil de cliente. |
| Nota fiscal (NF-e / NFC-e) | Mock | Não existe emissão, certificado nem campos fiscais. |
| Logo e foto da loja | Mock | Não há campo no cadastro. |
| Razão social, CNPJ/CPF, inscrição, CNAE, regime | Mock | O cadastro pede só nome, telefone e endereço. |
| Comprar créditos de anúncio | Mock | A tela diz para esperar a plataforma liberar mais créditos. |
| Tour depois do cadastro | Mock | Não existe. A pessoa cai no painel sem guia. |
| Mandar o anúncio no WhatsApp | Mock | Não há botão que mande a imagem. |
| Visual próprio da marca da loja | Mock | Dá para mudar cores do app da pessoa. Não dá para vestir a vitrine da loja. |

### Motoboy

| Função | Situação | O que acontece de verdade |
| --- | --- | --- |
| Cadastro com CNH, veículo, placa e fotos | Real | Fica pendente até o administrador aprovar. |
| Aprovar ou recusar no painel | Real | O administrador vê as fotos e libera ou não. |
| Ficar online com localização | Real | Sem GPS a corrida da cidade não chega. |
| Oferta: tempo, distância, ganho, selo Flash | Real | O valor é o que o motoboy recebe, não o total do pedido. Flash só aparece se o pedido for Flash. |
| Aceitar ou recusar | Real | A corrida muda de mãos de verdade. |
| Abrir no Google Maps ou no Waze | Real | Abre o aplicativo de mapa do celular. Não precisa de chave. |
| Cheguei, retirei, código, foto e “recebi o dinheiro” | Real | A entrega só fecha com o código certo. Dinheiro pede confirmação. |
| Lista do que já ganhou | Real | Cada entrega concluída gera uma linha de ganho. |
| Distância da corrida | Parcial | Só aparece quando a loja e o destino têm ponto no mapa. |
| GPS durante a corrida | Parcial | Funciona com o app aberto. Em segundo plano não é garantido. |
| Mapa dentro da corrida | Parcial | O desenho do trajeto existe. O caminho confortável continua sendo Maps ou Waze. |
| Receber o ganho no PIX sozinho | Mock | O valor fica numa lista. Ninguém transfere. |
| Área em que aceita trabalhar | Mock | Não há bairro nem raio escolhido pelo motoboy. O raio de 8 km é regra do sistema. |
| Horário em que aceita trabalhar | Mock | Não há grade de dias e horas. |

### Administração

| Função | Situação | O que acontece de verdade |
| --- | --- | --- |
| Visão geral | Real | Números de pedidos, lojas e pessoas saem do banco. |
| Pessoas | Real | Lista contas e gera o código de senha de 8 números. |
| Lojas | Real | Dá para ver e acompanhar. Não há uma fila de “aprovar loja antes de abrir”. |
| Pedidos | Real | Consulta o que está no banco. |
| Pagamentos | Real | Mostra o que foi registrado. Gerar PIX depende da chave do Mercado Pago. |
| Fiado e limite | Real | A equipe consegue ver e ajustar. |
| Gorjetas | Real | Lista o que foi gravado na entrega. |
| Suporte | Real | Lê e responde chamados. |
| Auditoria | Real | Há registro de ações importantes. |
| Motoboys, com as fotos dos documentos | Real | Aprovar e recusar grava o status. |
| Aprovar a loja antes de ela aparecer | Mock | A loja nasce já capaz de vender. |
| Mapa da cidade com os motoboys | Mock | Não há mapa operacional. |
| Verificação em duas etapas do admin | Mock | A mesma tela vazia do cliente. |
| Pedido em grupo | Mock | O próprio painel diz que não está liberado. |
| Ligar ou desligar a chave de inteligência artificial | Mock | Não há tela. A chave, se existir, mora só no servidor. |

### Para todo mundo (o que o APK versão 3 mostrou)

| Função | Situação | O que acontece de verdade |
| --- | --- | --- |
| Perfil da conta | Parcial | A conta da loja mostra ao mesmo tempo a seção CLIENTE (Meus pedidos, Endereços, Pagamentos) e MINHA LOJA. O certo é mostrar só o papel que a conta tem. Se um dia a mesma pessoa for cliente e lojista, aí sim as duas seções aparecem. |
| “Número para as lojas chamarem você” | Mock | Aparece em toda conta, inclusive na loja. O número é o identificador interno da pessoa (no teste, 89). Não é um código de motoboy. Loja não chama ninguém por esse número. |
| Saudação “Bom almoço, Leonardo” | Parcial | Não é nome de mentira escrito na tela. “Bom almoço” é a frase das 11h às 15h. O nome é a primeira palavra do nome da conta. Ver a explicação logo abaixo. |
| Barra de baixo e botão “Fechar assistente” | Parcial | Os dois ficam por baixo dos botões do Android. A barra funciona, mas o dedo erra e o botão de fechar some. |

**Contagem desta tabela:** 42 reais, 22 parciais, 22 de mentira. São 86 funções. O piloto de pedido (pedir, aceitar, entregar, receber em dinheiro) está na coluna Real. O que o Leonardo viu no celular — perfil misturado, mascote, barra, cadastro curto, anúncio e assistente — está em Parcial ou Mock.

### De onde sai o nome “Leonardo”

As duas telas leem o mesmo campo: o nome salvo na conta.

- “Bom almoço” troca sozinho conforme a hora: madrugada, bom dia, bom almoço (11h–15h), boa tarde, boa noite. Não é o nome de uma pessoa.
- A vírgula e o primeiro nome vêm de `user.name`, que o servidor devolve para a conta logada.
- Procurei a palavra “Leonardo” no aplicativo. Ela não está escrita em lugar nenhum da tela. Não é um nome de demonstração.

O perfil da Maria Beatriz (`hsantiagodebem@gmail.com`) mostra o nome que o servidor mandou nessa consulta. A saudação pode mostrar outro nome porque, no Android, o app primeiro pinta o nome guardado no aparelho e só depois pergunta de novo ao servidor. A vitrine e o perfil fazem essa pergunta separados. Se o telefone ainda tem um login antigo (num teste anterior de entrada com Google a identidade gravada foi “Leonardo Aranha”) e a conta aberta agora é a Maria, uma das telas fica com o nome velho até a resposta chegar. Se a resposta falhar, o nome velho permanece.

Não é mock. É memória velha do aparelho brigando com a conta atual. O conserto é: uma única fonte de nome, só o que o servidor confirmou, e apagar o nome guardado quando a pessoa sai ou troca de conta.

---

## 2. Mascote e encaixe na tela

O mascote não está “solto” por acaso. A posição é um número fixo, não a medida da tela.

| O que o Leonardo viu | Causa no programa |
| --- | --- |
| O mascote fica em cima do carrossel “Sabor do momento” | Ele é uma camada flutuante por cima da página, no canto direito, com prioridade alta. O carrossel rola por baixo. |
| O mascote senta na barra de baixo | A altura é fixa: 84 pontos, ou 164 se houver carrinho. Não olha a barra nem os botões do sistema. |
| A barra de baixo fica debaixo dos botões do Android | O app desenha até a borda do vidro (`edgeToEdge` ligado) e a barra usa `bottom: 14` fixo. A área segura de baixo não entra na conta. |
| “Fechar assistente” some atrás da navegação do Android | O painel do assistente reserva só 18 pontos embaixo. O botão é o último item. Num celular com gestos ou três botões, ele fica escondido. |
| O mascote muda de pose e corta a borda | Quando está parado, ele troca de cena a cada 8–12 segundos: deita, dorme, dança, tapa os olhos. A caixa tem 82 por 82. O balão de fala tem 138 de largura e nasce para a esquerda, em cima dos cards. |
| Os olhos travam no Android | O piscar não usa a mesma animação do corpo. Uma parte é nativa e a outra não. As duas juntas engasgam. |
| Na introdução, mascote, bolinhas e botões se apertam | A faixa do mascote tem altura fixa (180) e um espaço de cima fixo (56). Não respeita o entalhe nem a tela pequena. |
| O mascote some e volta em outra pose | Ele só aparece na vitrine do cliente, e some em pedido, perfil e painéis. Ao voltar, a pose pula. |
| O toque acerta o mascote em vez do card | A área clicável é maior do que o desenho e fica por cima do conteúdo. |
| Duas animações ao mesmo tempo | O corpo usa um sistema e a flutuação usa outro. Os dois correm juntos. |

O conserto da Fase 1 é um só: medir a área segura de baixo e de cima, reservar a barra, e colocar o mascote num canto que não cubra card, carrossel nem botão. Em tela pequena, esconder o balão. Uma animação só.

---

## 3. Cadastro da loja, cadastro do motoboy e nota fiscal

Hoje a loja nasce com nome, telefone, endereço e pino. O motoboy nasce com telefone, veículo, placa, número da CNH e três fotos. Isso chega para um pedido de teste. Não chega para nota fiscal nem para pagar a pessoa certa.

### Loja, em passos curtos

| Passo | O que pede | Agora ou depois |
| --- | --- | --- |
| 1. Conta | Nome de quem mexe no app, e-mail, celular, senha | Agora, obrigatório |
| 2. A loja | Nome fantasia (o que o cliente vê) e razão social | Agora, obrigatório |
| 3. Documento | CNPJ ou CPF (MEI). Um dos dois | Agora, obrigatório |
| 4. Endereço | Endereço fiscal completo e o pino no mapa. Se o balcão for outro, um segundo endereço | Agora, obrigatório |
| 5. Responsável | Nome, CPF e celular de quem responde pela loja | Agora, obrigatório |
| 6. Como entrega | Raio em km, motoboy da própria loja ou motoboy do Pediu, pedido mínimo, tempo de preparo, retirada no balcão | Agora, obrigatório. Vários desses campos já existem nos ajustes; precisam subir para o cadastro |
| 7. Para onde cai o dinheiro | Chave PIX do repasse | Agora, obrigatório. Banco, agência e conta podem esperar |
| 8. Foto | Logo ou foto da fachada | Agora, opcional. Trocar cor e moldura da marca fica para depois |
| 9. Fisco | Inscrição estadual, inscrição municipal, regime (Simples, MEI, lucro presumido) e CNAE | Guardar no cadastro agora, se a pessoa já tiver. Obrigatório só quando for emitir nota |

Sem o passo 9 preenchido, a loja vende no piloto. Não emite nota.

### Motoboy, em passos curtos

| Passo | O que pede | Agora ou depois |
| --- | --- | --- |
| 1. Conta | Nome, e-mail, celular, senha | Agora, obrigatório |
| 2. Documento | Número da CNH, foto da CNH, selfie | Agora, obrigatório. Já existe |
| 3. Veículo | Moto, carro ou bike, placa (menos bike), foto do veículo | Agora, obrigatório. Já existe |
| 4. Pagamento | Chave PIX para o repasse | Agora, obrigatório. Ainda não existe |
| 5. Onde e quando | Cidade ou bairros, e dias/horários | Agora, obrigatório, de forma simples |
| 6. Análise | A equipe aprova antes da primeira corrida | Agora. Já existe |

Repasse automático para o PIX fica para uma fase posterior. No piloto o ganho aparece na lista e o pagamento é manual.

### Nota fiscal: fase posterior, com honestidade

Emitir NF-e ou NFC-e não é um campo a mais na tela. Precisa de um emissor e de um certificado digital A1 da loja (arquivo e senha, guardados no servidor, nunca no aplicativo).

Provedores que já fazem isso no Brasil: Focus NFe, eNotas ou NFE.io. O Pediu mandaria os dados da venda; o provedor falaria com a Secretaria da Fazenda. Cada um cobra por nota ou por pacote, fora o certificado A1, que a loja compra no seu nome.

Isso é Fase 3. Colocar o botão “emitir nota” antes do certificado, do regime e do CNAE só criaria uma nota que não existe.

---

## 4. Navegação por papel e tour da loja

O app hoje tem duas casas: as abas de cliente e um modo loja por cima, mais páginas soltas de motoboy, anúncio e entrega. A mesma conta vê convite para vender, convite para entregar e o número “para as lojas chamarem”.

### Como fica cada papel

**Cliente:** Início, Busca, Pedidos, Perfil. O assistente vira um botão no início, não um quinto ícone no meio da barra. O mascote fica acima da barra, sem cobrir o carrossel.

**Lojista:** Início da loja, Pedidos, Cardápio, Anúncios, Ajustes. Sem seção de cliente, sem número de motoboy, sem “quero ser entregador”, a menos que essa conta também tenha esse papel.

**Motoboy:** Ofertas, Corrida, Ganhos, Conta. O número interno da conta não aparece como se a loja discasse para ele.

**Admin:** o console que já existe, mais tarde uma tela só para ver se a inteligência artificial está ligada (sem mostrar a chave).

Quem tiver dois papéis troca no perfil, com um botão com o nome do papel. O app não mistura as seções.

### Tour da loja, logo depois do cadastro

Cinco bolhas, com “próximo” e “pular”. Não volta se a pessoa concluir ou pular.

1. “Sua loja já está no mapa.” Mostra o nome fantasia.
2. “O cardápio mora aqui.” Abre o caminho de cadastrar o primeiro produto.
3. “Pedido novo cai aqui e o celular avisa.” Mostra a fila de pedidos.
4. “Anúncio fica aqui e gasta créditos da loja.” Mostra a tela de anúncios, mesmo que a compra de créditos venha na fase seguinte.
5. “Horário, raio, motoboy e PIX ficam em Ajustes.”

---

## 5. Anúncios com imagem, créditos e o assistente

### O que o APK faz hoje

O anúncio não é um desenho falso na tela. O servidor pede um texto ao modelo `gpt-5-mini` e uma imagem ao modelo GPT Image 2 (`MODEL_GPT_IMAGE_2`, qualidade média). Publicar coloca a imagem no Explorar.

Isso só acontece se o servidor tiver `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY`. Essa chave é de um corredor interno, não uma chave que o Leonardo cria na OpenAI. Sem ela, a geração quebra. A loja ganha 3 créditos de presente. Não há compra. Não há “mandar no WhatsApp”: o compartilhar do cardápio manda texto.

O assistente é o mesmo corredor. Frase digitada vai para `gpt-5-mini`. Áudio do celular vai para o Whisper (`whisper-1`). Os dois usam a mesma chave interna. Sem a chave, a pessoa vê “Não consegui conectar ao assistente” e só restam os atalhos. A chave não está dentro do APK, e não deve estar.

### O que usar daqui para frente

Uma chave só, da conta OpenAI do Pediu, com o nome `OPENAI_API_KEY`.

- Ela fica no servidor (Render), nas variáveis de ambiente.
- O aplicativo nunca vê a chave. O celular pede “gera um anúncio” ou “entende esta frase”; o servidor chama a OpenAI.
- O administrador vê no painel apenas “ligada” ou “desligada”, o modelo escolhido e um teto de gasto do dia. Não vê a chave. Trocar a chave é trocar a variável no Render, não um campo no app.

**Imagem do anúncio.** Modelo `gpt-image-2`, qualidade média, quadrada 1024×1024. Na tabela do guia oficial de imagem da OpenAI (modelos anteriores ao Image 2.5, linha GPT Image 2), essa saída custa cerca de **US$ 0,053 por imagem**. Qualidade baixa fica em cerca de US$ 0,006; qualidade alta, cerca de US$ 0,211. O texto do pedido da imagem usa outra tarifa (US$ 5 por milhão de tokens de entrada) e, num anúncio curto, quase não pesa. Fonte: [guia de geração de imagem](https://developers.openai.com/api/docs/guides/image-generation) e [preços](https://developers.openai.com/api/docs/pricing), consultados em 18 de outubro de 2026. A conta final vem do campo `usage` de cada resposta.

**Texto do anúncio e do assistente.** Modelo `gpt-5-mini`: US$ 0,25 por milhão de tokens de entrada e US$ 2 por milhão de tokens de saída. Uma frase curta fica bem abaixo de um centavo de dólar.

**Voz.** Whisper: US$ 0,006 por minuto. Quinze segundos de fala custam uma fração disso.

Recomendação de custo: rascunho em qualidade baixa se um dia precisar, e a imagem que a loja publica em qualidade média. Não usar qualidade alta no piloto.

### Créditos

1 crédito = 1 imagem gerada.

- A loja compra um pacote (sugestão: 10, 30 ou 100) com PIX, na conta da loja, pelo Mercado Pago que o Pediu já sabe chamar.
- O preço do pacote cobre o custo da OpenAI mais a margem do Pediu. Com cerca de US$ 0,05 por imagem, um pacote de 10 imagens custa cerca de US$ 0,53 só de modelo, antes de margem e de câmbio.
- Na hora de gerar, o saldo desce 1. Se a OpenAI falhar, o crédito volta.
- Publicar no Explorar não gasta outro crédito: a imagem já foi paga.
- O texto do anúncio entra no mesmo crédito, porque custa quase nada perto da imagem.

### WhatsApp e Explorar

- **Explorar:** o botão Publicar continua gravando o anúncio como publicado. A vitrine já sabe mostrar a imagem do anúncio publicado.
- **WhatsApp:** um botão Compartilhar manda a imagem pelo compartilhar do celular. A pessoa escolhe o WhatsApp. O Pediu não precisa da API oficial do WhatsApp para isso.

### Moderação

Antes de publicar, o servidor recusa anúncio com nudez, política, promessa de saúde ou dado de outra loja. Uma lista simples de termos mais a moderação da própria OpenAI. Anúncio suspeito fica “em análise”. O administrador pode tirar do ar. A loja vê o motivo em uma frase, sem código.

### Assistente, do mesmo jeito

- Atalhos continuam funcionando sem gastar crédito.
- Frase livre e áudio passam pela `OPENAI_API_KEY` no servidor.
- O assistente só escolhe uma ação que já existe (buscar, abrir pedidos, abrir cardápio). Ele não confirma pagamento e não emite nota.
- Teto diário no painel do admin, para uma loja ou um cliente não gerar conta surpresa.
- O botão “Fechar assistente” sobe para cima dos botões do Android.

---

## 6. Plano em três fases

Tamanho é o quanto de tela, banco e serviço externo mexe. Não é prazo de calendário.

### Fase 1 — o piloto ficar compreensível

O pedido de verdade já anda. Esta fase tira a confusão que o APK versão 3 mostrou.

- Mascote, barra e botão de fechar respeitando a área do Android.
- Perfil só com o papel da conta. Some o “número para as lojas”.
- Saudação usa só o nome confirmado pelo servidor.
- Cadastro da loja com os passos 1 a 8 da seção 3. Dados fiscais guardados se a pessoa tiver, sem emitir nota.
- Cadastro do motoboy com PIX, área e horário.
- Tour de cinco passos para a loja.
- Abas separadas por papel.

Tamanho: médio. Muitas telas, pouco serviço novo. O banco ganha colunas e, se precisar, uma tabela de preferências. Sem chave nova.

### Fase 2 — anúncio e assistente de verdade

- Trocar o corredor interno pela `OPENAI_API_KEY` no Render.
- Créditos comprados com PIX e estorno se a imagem falhar.
- Publicar no Explorar e compartilhar a imagem no WhatsApp.
- Moderação e teto diário no admin.
- Assistente de frase e voz no mesmo caminho.

Tamanho: médio. Depende da chave da OpenAI e da chave do Mercado Pago, as duas só no servidor.

### Fase 3 — o que não cabe no piloto

- Nota fiscal com Focus NFe, eNotas ou NFE.io, mais certificado A1.
- Repasse automático do ganho do motoboy e da loja via PIX.
- GPS do motoboy com o app fechado.
- Logo virando a cara da vitrine, não só um arquivo.
- Pedido em grupo, e-mail de senha e verificação em duas etapas, se ainda fizerem falta.
- Cupom criado pela própria loja.

Tamanho: grande. Cada item fala com um serviço de fora e com regra fiscal ou bancária.

### O que não fazer na Fase 1

Não emitir nota. Não prometer prazo de entrega que o mapa não calculou. Não colocar a chave de IA dentro do APK. Não deixar o perfil mostrar papel que a conta não tem.
