# Fase G11 — Produto e carrinho global

## Objetivo

Fechar a primeira conexão vertical de compra no frontend: o usuário deverá sair de uma loja ou da busca, abrir o produto, escolher a quantidade e adicionar o item a um carrinho global. O carrinho deverá sobreviver à navegação e a uma recarga local, respeitar uma única loja por operação e encaminhar dados consistentes ao checkout server-side já existente.

Esta fase começa no commit `9acd96c` do pull request aberto. O backend de catálogo e pedidos já existe, mas o frontend ainda mantém estado de carrinho dentro da home. A implementação substituirá esse estado isolado por um `CartProvider` persistente sem remover o fluxo legado até que a conexão vertical seja validada.

## Escopo

O domínio do carrinho terá itens com produto, loja, preço persistido no momento da seleção, quantidade, taxa de entrega e observação opcional. O domínio oferecerá adição, remoção, alteração de quantidade, limpeza, subtotal e taxa de entrega. Produtos de lojas diferentes não poderão ser combinados no mesmo carrinho.

A tela de produto deverá apresentar estado inválido, carregamento, erro, disponibilidade, descrição, preço, quantidade e ação de adicionar. A tela de loja e a busca deverão abrir o produto ou adicioná-lo por meio do mesmo contexto global. A rota `/cart` deverá exibir itens, controles de quantidade, subtotal, entrega e total estimado. O checkout dedicado deverá receber o snapshot do carrinho e chamar `orders.create` com chave de idempotência.

## Regras de domínio

O preço exibido e enviado pelo frontend é apenas informativo. O backend continuará validando preço, disponibilidade, loja, taxa e total no momento da criação do pedido. O carrinho não deverá aceitar quantidade menor que um e deverá remover o item quando a quantidade chegar a zero.

O carrinho deverá ser persistido com armazenamento local. A hidratação deverá ter estado explícito para evitar sobrescrever dados salvos com o estado inicial vazio. Falhas de armazenamento não poderão bloquear a navegação, mas deverão ser observáveis no log local.

Quando um produto pertencer a uma loja diferente da loja atual do carrinho, a UI deverá mostrar uma decisão explícita. Nesta primeira etapa, a operação será recusada sem apagar o carrinho existente.

## Ordem de implementação

1. Criar tipos e funções puras do domínio do carrinho.
2. Criar o `CartProvider` persistente e instalá-lo acima das rotas.
3. Integrar a tela de produto e a tela de loja ao provider.
4. Criar a tela `/cart` com estados de carregamento, vazio, erro e ação para checkout.
5. Integrar o checkout dedicado ao carrinho, endereço persistente e `orders.create`.
6. Migrar progressivamente o carrinho legado da home para o provider, mantendo o CI verde.
7. Adicionar testes unitários do domínio e testes de contrato da navegação vertical.
8. Executar typecheck, testes, build, lint e E2E web com o banco de teste.

## Critérios de aceite

A fase será aceita quando um item puder ser aberto a partir do catálogo, adicionado ao carrinho, encontrado na rota `/cart`, ter sua quantidade alterada e ser removido. Uma recarga deverá restaurar o carrinho local. Um item de outra loja deverá ser recusado sem alterar os itens existentes. O subtotal e a taxa deverão ser calculados de forma determinística no domínio local. O checkout deverá enviar os itens ao backend e continuar sujeito à validação server-side e à idempotência.

## Evidências

A documentação deverá registrar o commit-base, os arquivos alterados, os testes do domínio, os resultados do typecheck, build e lint, além do fluxo manual produto → carrinho → checkout. Limitações específicas de plataforma nativa deverão ser registradas separadamente.

## Referências

[1]: ./IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ../upload/pasted_content.txt "Mapa vertical de implementação do Pediu"
[3]: ./FASE_ENDERECOS_CHECKOUT_INTEGRACAO.md "Fase anterior de endereços e checkout server-side"

## Atualização de execução — 2026-09-21

O `CartProvider` foi criado em `providers/cart-provider.tsx` e instalado no layout raiz. O domínio puro em `lib/cart.ts` concentra a regra de uma única loja, merge de produtos repetidos, quantidades, remoção, subtotal, entrega e total. O estado é persistido em AsyncStorage com hidratação explícita e falhas de armazenamento não bloqueantes.

A rota `/product/[id]` agora possui estados de produto inválido, carregamento, erro, disponibilidade, quantidade e adição ao carrinho. A loja navega para o detalhe real do produto. A home passou a alimentar o mesmo provider global, e o ícone do carrinho abre a rota `/cart`. A rota `/cart` exibe itens, alteração de quantidade, remoção, limpeza, subtotal, taxa de entrega e total estimado. A rota `/checkout` consome o snapshot do carrinho, endereços persistidos, método de pagamento e `orders.create` com chave de idempotência.

Foram adicionados três testes unitários do domínio do carrinho. O typecheck, a suíte automatizada e o build passaram. O lint passou sem erros, mantendo apenas avisos preexistentes em telas antigas.

No preview web, a rota `/product/101` foi aberta com o produto persistido. O item foi adicionado ao carrinho, a rota `/cart` exibiu subtotal de R$ 18,00, entrega de R$ 5,00 e total de R$ 23,00. O botão de quantidade atualizou o carrinho para dois itens, subtotal de R$ 36,00 e total de R$ 41,00. Uma recarga da rota preservou os dois itens, confirmando a persistência local.

O checkout anônimo exibiu corretamente a exigência de sessão. O checkout autenticado completo ficou **não validado operacionalmente** neste ambiente porque o token temporário disponível retornou HTTP 401 no endpoint oficial `/api/auth/session`; essa limitação foi registrada sem assumir sucesso indevido.

## Correção de autenticação e dados de demonstração — 2026-09-21

A revisão operacional encontrou uma inconsistência entre a aparência e a sessão real: o perfil da home usava `Ana Beatriz` e `ana.beatriz@email.com` como fallback, enquanto as queries protegidas de pedidos permaneciam desabilitadas sem cookie de sessão. O fallback foi removido. Visitantes agora são identificados como `Visitante`, a home usa `Olá!` e a aba de pedidos informa explicitamente que a sessão é necessária para consultar o histórico real.

O painel vendedor deixou de exibir nome de loja, pessoa, pedidos, vendas e clientes artificiais. O conteúdo agora deriva das queries de loja, pedidos, produtos e vendas. A função de login OAuth passou a validar `EXPO_PUBLIC_OAUTH_PORTAL_URL` e `EXPO_PUBLIC_APP_ID` antes de construir a URL. Quando o ambiente não possui essas variáveis, a interface mostra um aviso controlado em vez de lançar `Failed to construct 'URL': Invalid URL`.

No Expo Web, foi validado que a home não inventa mais uma conta, a aba de pedidos apresenta o botão de login e o acionamento de modo vendedor permanece estável com o aviso de configuração ausente. O fluxo OAuth real continua dependente da configuração das variáveis públicas do ambiente de preview.
