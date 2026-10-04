import type { Express } from "express";

const privacy = `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Política de privacidade — Pediu</title>
<body style="font-family: sans-serif; line-height: 1.5; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #18252b">
<h1>Política de privacidade</h1>
<p>Versão 1.0. Esta política descreve como o aplicativo Pediu trata dados pessoais de clientes, lojistas e entregadores.</p>
<h2>Quem opera</h2>
<p>O responsável pelo tratamento é a pessoa ou empresa titular da conta de desenvolvedor que publica o Pediu nas lojas de aplicativo. O contato para privacidade é o mesmo canal de suporte informado na ficha da loja.</p>
<h2>Dados tratados</h2>
<ul>
<li>Conta: identificador de login, nome e e-mail.</li>
<li>Endereço de entrega e, quando você permite, a localização do aparelho enquanto usa o app.</li>
<li>Pedidos, itens, totais, forma de pagamento e o histórico de status.</li>
<li>Mensagens de chat e de suporte que você envia.</li>
<li>Token de notificação, se você autorizar avisos.</li>
<li>Áudio do microfone, apenas quando você inicia um pedido por voz. O áudio não é gravado para outra finalidade.</li>
</ul>
<h2>Para que servem</h2>
<p>Os dados servem para autenticar a conta, mostrar lojas, calcular a entrega, criar e acompanhar pedidos, avisar sobre o status e atender suporte. A localização em segundo plano não é usada.</p>
<h2>Pagamento</h2>
<p>O aplicativo não armazena número de cartão. Nesta versão o cliente paga em dinheiro na entrega. Pedidos e registros financeiros são mantidos pelo prazo exigido pela legislação, mesmo depois do encerramento da conta.</p>
<h2>Seus direitos</h2>
<p>Na área de privacidade do aplicativo você pode consultar esta política, exportar um resumo dos seus dados e encerrar a conta. O encerramento apaga nome, e-mail, endereços, identificador de login, tokens e o conteúdo das mensagens. Pedidos e pagamentos permanecem sem o identificador de login, apenas pelo prazo legal.</p>
<h2>Compartilhamento</h2>
<p>A loja do pedido recebe o necessário para preparar e entregar. O provedor de login recebe apenas o que a autenticação exige. Não vendemos dados pessoais.</p>
</body>
</html>`;

const terms = `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Termos de uso — Pediu</title>
<body style="font-family: sans-serif; line-height: 1.5; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #18252b">
<h1>Termos de uso</h1>
<p>Versão 1.0. O Pediu conecta quem pede, quem vende e quem entrega no comércio local.</p>
<h2>Conta</h2>
<p>Você é responsável pelo acesso à sua conta. O preço, a disponibilidade e o total do pedido são confirmados pelo servidor, não pelo aparelho.</p>
<h2>Pedido e pagamento</h2>
<p>Nesta versão o pagamento do cliente é em dinheiro na entrega. Um pedido confirmado fica vinculado à loja e ao endereço informados. O lojista atualiza o status até a entrega ou o cancelamento permitido.</p>
<h2>Conteúdo</h2>
<p>Não publique dados de outra pessoa no chat ou no suporte sem necessidade do pedido. Podemos remover conteúdo que impeça a operação segura do serviço.</p>
<h2>Encerramento</h2>
<p>Você pode encerrar a conta na área de privacidade. A exclusão remove os dados pessoais descritos na política e preserva os registros financeiros pelo prazo legal.</p>
</body>
</html>`;

export function registerLegalRoutes(app: Express) {
  app.get("/legal/privacy", (_req, res) => {
    res.type("html").send(privacy);
  });
  app.get("/legal/terms", (_req, res) => {
    res.type("html").send(terms);
  });
}
