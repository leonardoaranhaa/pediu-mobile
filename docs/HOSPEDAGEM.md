# Onde hospedar o Pediu

Este guia é para quem vai colocar o Pediu no ar pela primeira vez. Não cria contas. Você cola as chaves nos lugares indicados.

## O que o servidor precisa

- **Programa:** Node.js 20. O comando de produção é `pnpm build` e depois `pnpm start`.
- **Banco:** hoje o código fala **MySQL**. A decisão do projeto é usar o **Supabase**, que oferece **Postgres**. A URL `postgres://` do Supabase **ainda não liga** neste código. Se você colar essa URL, o servidor avisa e não sobe. O arquivo `.env.example` mostra o formato.
- **Login:** o aplicativo usa um provedor de login de fora (endereços `OAUTH_SERVER_URL` e `EXPO_PUBLIC_OAUTH_PORTAL_URL`). Não é e-mail e senha dentro do Pediu.
- **Tarefas de fundo:** avisos, reserva de estoque e ofertas de entrega rodam **dentro do mesmo processo** do servidor. Não há fila separada. Use **uma** instância. Duas cópias ao mesmo tempo podem repetir essas tarefas.
- **Aviso no celular:** o servidor manda o aviso para o serviço da Expo (`exp.host`). Não precisa de outro programa. O celular precisa permitir notificações.

## Login do Supabase

O Supabase tem um login próprio (e-mail, Google, Apple). Ele **não encaixa** no login atual do Pediu. Trocar agora seria reescrever a entrada do aplicativo. No piloto, use o Supabase só como banco, quando o código passar a falar Postgres. O login continua no provedor que o aplicativo já espera.

## Recomendação para um piloto em cidade pequena

**Servidor:** [Render](https://render.com), plano Starter, uma instância. É um site com botão de publicar, log e variável de ambiente. Cabe no bolso de um piloto.

**Banco (decisão):** [Supabase](https://supabase.com), projeto Free para começar. Crie o projeto agora e guarde a senha. Só aponte o Pediu para ele depois que o código aceitar Postgres. Enquanto isso, o piloto real precisa de um MySQL pequeno (o painel da Render também cria um MySQL). Custo aproximado, confira no site na hora de pagar:

- Supabase Free: R$ 0, com limite de espaço e o projeto pode dormir se ninguém usar por vários dias.
- Supabase Pro: cerca de US$ 25 por mês, se o banco não puder dormir.
- Render Starter (o programa do Pediu): cerca de US$ 7 por mês.
- MySQL pequeno na Render, enquanto o código não fala Postgres: cerca de US$ 7 por mês.

Um piloto modesto fica em torno de **US$ 7 a US$ 40 por mês**, conforme o banco dormir ou não e se o MySQL temporário ainda for necessário.

**Alternativa:** [Fly.io](https://fly.io) no lugar da Render, máquina pequena compartilhada, cerca de US$ 5 por mês, mais o mesmo Supabase. A Fly pede um pouco mais de terminal. A Render é mais simples para a primeira vez.

Não use o computador de casa como servidor. O celular na rua não alcança o `localhost`.

## Passo a passo: Supabase

1. Entre em [supabase.com](https://supabase.com) e crie uma conta.
2. **New project**. Escolha um nome, uma senha forte do banco e a região mais próxima do Brasil (por exemplo São Paulo, se aparecer). Guarde a senha.
3. Espere o projeto ficar pronto.
4. Abra **Project Settings → Database**. Copie a connection string no modo **URI**. Ela começa com `postgresql://`.
5. Não cole essa URI em `DATABASE_URL` deste Pediu ainda. O programa recusa Postgres de propósito, para não parecer que subiu e perder dados.
6. Quando uma versão futura aceitar Postgres, a mesma URI entra em `DATABASE_URL` no servidor, e as migrations rodam com `pnpm exec drizzle-kit migrate` apontando para esse banco. As migrations de hoje são SQL de MySQL. Elas não devem ser aplicadas no Supabase.

## Passo a passo: servidor na Render

1. Suba este repositório no GitHub, se ainda não estiver.
2. Na Render, **New → Blueprint** e aponte para o repositório. O arquivo `render.yaml` descreve o serviço `pediu-api`.
3. No painel, preencha as variáveis que o arquivo deixou em branco. Use `.env.example` como lista. O mínimo para o servidor subir em produção é:
   - `DATABASE_URL` no formato MySQL, até a conversão para Postgres
   - `VITE_APP_ID`
   - `JWT_SECRET` (uma frase longa e aleatória)
   - `ALLOWED_ORIGINS` (o endereço https do site, se houver; para só celular, use o endereço https da própria API)
   - `OBSERVABILITY_TOKEN`
   - `OAUTH_SERVER_URL` e `OWNER_OPEN_ID` quando o login estiver definido
4. Publique. A Render mostra uma URL `https://....onrender.com`.
5. Abra `https://essa-url/api/health`. Tem que responder que está ok.
6. No aplicativo, essa URL é `EXPO_PUBLIC_API_BASE_URL`. O mesmo texto de `VITE_APP_ID` vira `EXPO_PUBLIC_APP_ID`.

## O que falta só com as suas contas, para o APK

O código não gera o arquivo do Android daqui. Na sua máquina ou no site da Expo:

1. Crie a conta em [expo.dev](https://expo.dev).
2. No projeto, entre com `npx eas-cli login`.
3. Crie o projeto EAS se ele pedir (`npx eas-cli init`).
4. No site da Expo, ambiente **preview**, cadastre:
   - `EXPO_PUBLIC_API_BASE_URL` = a URL https da Render, sem barra no fim
   - `EXPO_PUBLIC_APP_ID` = o mesmo valor de `VITE_APP_ID`
   - `EXPO_PUBLIC_OAUTH_PORTAL_URL` e `EXPO_PUBLIC_OAUTH_SERVER_URL` = o login, quando existir
5. Rode `pnpm build:preview`. O perfil `preview` gera um APK.
6. Baixe o APK e instale nos celulares de teste. O Android pede permissão para instalar de fora da loja.
7. PIX e Mercado Pago ficam para depois. No primeiro teste, use dinheiro na entrega (`PIX_PROVIDER=manual` no servidor).

Sem a URL https pública e sem o login configurado, o APK abre e o botão de entrar fica desligado.
