# Onde hospedar o Pediu

Este guia é para colocar o servidor no ar de graça, no começo. Não cria contas. Você cria o projeto no Supabase, copia a connection string e cola na Render.

O ambiente antigo chamado WebDev era só o computador de testes em que o aplicativo rodava antes. Ele não faz parte do caminho. Não precisa de plano Autoscale nem de Reserved Hosting.

## O que sobe onde

- **Banco:** Supabase, plano Free. É Postgres. O login do Supabase (e-mail, Google) não é o login do Pediu.
- **Programa do servidor:** Render, plano Free, **uma** instância, região Virginia. Node.js 20. A construção é `pnpm install --frozen-lockfile && pnpm build` e a partida é `pnpm start`.
- **Login:** e-mail e senha criados no próprio Pediu. Não há mais conta da Manus.
- **Avisos no celular:** o servidor fala com o serviço da Expo. Não há outro programa.
- **Tarefas de fundo:** avisos, reserva de estoque, ofertas de entrega e limpeza de limite rodam dentro desse mesmo processo.

## Plano gratuito: o que dorme

O plano Free da Render desliga o servidor depois de cerca de 15 minutos sem ninguém chamando. Enquanto está desligado, os avisos e a nova oferta para o motoboy não andam.

O plano Free do Supabase também pausa o banco depois de vários dias sem uso. Aí o servidor acorda, mas o banco ainda está dormindo até a primeira ligação.

Quando alguém abre o aplicativo, ou quando o despertador abaixo chama o servidor, o processo sobe de novo e **coloca o trabalho em dia na hora**. Isso recupera o que ficou parado, com um atraso. Não é o mesmo que ficar ligado o tempo todo.

## Despertador gratuito

O jeito mais simples, ainda de graça:

1. Na Render, crie um `OBSERVABILITY_TOKEN` longo e aleatório.
2. Em um site gratuito de agenda, como [cron-job.org](https://cron-job.org), crie uma tarefa a cada 10 minutos.
3. Ela chama, com o método GET:

   `https://seu-servico.onrender.com/api/internal/workers/tick`

4. No cabeçalho, envie `Authorization` com o valor `Bearer ` seguido do mesmo token. Não coloque o token no endereço, se o site permitir cabeçalho. Se só aceitar o endereço, use `?token=` com o mesmo valor. O endereço pode aparecer no registro da Render; o cabeçalho é mais discreto.

Esse endereço recusa quem não manda o token. `/api/health` só diz que o processo acordou. O tick é que executa avisos, ofertas vencidas, estoque parado e limpeza.

Troca do plano gratuito: a primeira visita depois do sono espera o servidor ligar (pode passar de meio minuto). Um aviso pode atrasar até o próximo toque do despertador. Com uma instância só, as tarefas não se atropelam.

## O que trocar antes de abrir para o público

Antes de vender de verdade, saia do grátis:

- **Render plano Starter** (pago, uma instância sempre ligada, cerca de US$ 7 por mês). Aí o despertador deixa de ser obrigatório.
- **Supabase plano Pro** (cerca de US$ 25 por mês) para o banco não pausar.
- PIX de verdade, domínio com cadeado, backup conferido e o aplicativo publicado na loja.

Confira os preços no site no dia de pagar. Um piloto com pouca gente pode ficar no grátis e aceitar a demora de acordar.

**Alternativa** se a Render não agradar: Fly.io, máquina pequena, com o mesmo Supabase. Também exige uma instância só.

## Passo a passo: Supabase

1. Entre em [supabase.com](https://supabase.com) e crie uma conta.
2. **New project**. Nome, senha forte do banco e a região mais perto do Brasil. Guarde a senha.
3. Espere ficar pronto.
4. Abra **Project Settings → Database → Connection string**.
5. Copie a URI. Ela começa com `postgresql://`. Pode ser a conexão **Session pooler** ou a **direta**. As duas servem. Se usar a porta **6543** (transaction pooler), o servidor também aceita: ele desliga os prepared statements e usa SSL.
6. Cole essa URI em `DATABASE_URL` na Render. Não crie outro banco.

As tabelas entram com:

```bash
DATABASE_URL='postgresql://...' pnpm exec drizzle-kit migrate
```

Se a migration falhar na porta 6543, cole a URI direta (porta 5432) em `DIRECT_URL` e rode o comando de novo. O aplicativo pode continuar com a URI do pooler em `DATABASE_URL`.

As tabelas públicas ficam com a trava do Postgres ligada (row level security) e sem regra de acesso. O servidor entra como dono do banco (`postgres`) e continua lendo e gravando. As chaves `anon` e `authenticated` do Supabase não enxergam essas tabelas. Não desligue essa trava e não crie política para essas chaves. Tabela nova no schema precisa da mesma trava (`.enableRLS()`), senão o teste do repositório falha.

## Passo a passo: Render

1. Envie este repositório para o GitHub, se ainda não estiver.
2. Na Render, **New → Blueprint** e aponte para o repositório. O arquivo `render.yaml` descreve o serviço `pediu-api` no plano free.
3. Preencha no painel o que ficou em branco. A lista está em `.env.example`. O mínimo:
   - `DATABASE_URL` com a URI do Supabase
   - `JWT_SECRET` (frase longa e aleatória)
   - `ALLOWED_ORIGINS` (o endereço https da própria API, se ainda não houver site)
   - `OBSERVABILITY_TOKEN`
   - `ADMIN_EMAILS` com o e-mail de quem vai administrar, separado por vírgula se forem vários
4. Publique. A Render mostra uma URL `https://....onrender.com`.
5. Abra `https://essa-url/api/health`. Tem que responder que está ok. A primeira vez pode demorar, porque o plano grátis acorda do zero.
6. Rode a migration do passo do Supabase, no seu computador, com a mesma URI.
7. Crie o despertador de 10 minutos do item acima.
8. No aplicativo, essa URL é `EXPO_PUBLIC_API_BASE_URL`, sem barra no fim.

## Primeira conta de administrador

Não existe uma conta pronta no banco. Coloque o seu e-mail em `ADMIN_EMAILS` na Render, abra o aplicativo e crie a conta com esse mesmo e-mail e uma senha. Essa conta já nasce como administradora. Quem se cadastra com outro e-mail vira cliente comum e pode, no aplicativo, abrir loja ou pedir para ser motoboy.

## Esqueci a senha

O Pediu ainda não envia e-mail. A tela de esqueci a senha não finge que mandou uma mensagem. Quem esqueceu a senha pede o código a quem administra. No painel de usuários, a pessoa administradora gera um código de 8 números, válido por 30 minutos, e lê esse código para a pessoa. Ela digita o código e a senha nova no aplicativo. O código aparece uma vez só.

## O que deixa de funcionar sem o serviço antigo

Pedido, login, loja, motoboy e aviso pelo aplicativo da Expo não dependem do serviço antigo da Manus. Sem as variáveis `BUILT_IN_FORGE_*` ficam desligados: imagem de anúncio gerada, envio de arquivo, transcrição de voz, ajuda de texto automático e o aviso antigo para o dono. O piloto não precisa deles.

## APK de teste

1. Crie a conta em [expo.dev](https://expo.dev).
2. No projeto, `npx eas-cli login`.
3. Se pedir, `npx eas-cli init`.
4. No site da Expo, a variável `EXPO_PUBLIC_API_BASE_URL` já está no ambiente **preview**, com o valor `https://pediu-mobile.onrender.com` e sem barra no fim. Não coloque senha nem segredo nessa variável.
5. Rode `pnpm build:preview`. O perfil `preview` gera um APK.
6. Instale nos celulares de teste. O Android pede permissão para instalar de fora da loja.
7. No primeiro teste, use dinheiro na entrega (`PIX_PROVIDER=manual`). PIX e Mercado Pago ficam para depois.

Antes de gerar um aplicativo de loja, cadastre a mesma `EXPO_PUBLIC_API_BASE_URL` no ambiente **production** da Expo. Sem isso, o build de produção não sabe o endereço do servidor.

O APK de teste que já está no celular foi gerado com o número de versão 1. O arquivo `app.config.ts` agora declara `android.versionCode` 2, e o perfil `preview` do `eas.json` sobe esse número sozinho (`autoIncrement`), usando a numeração remota da Expo (`appVersionSource`). Assim o próximo APK instala por cima do que já está no celular. Sem um número maior, o Android recusa a instalação.

Sem a URL https pública, o APK abre, mas não consegue criar conta nem entrar.
