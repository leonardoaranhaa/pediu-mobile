# Fase de endereços persistentes e checkout server-side

## Objetivo

Esta fase fecha a primeira conexão vertical do fluxo de compra. O cliente poderá criar, consultar, editar, excluir e definir o endereço padrão. O checkout poderá selecionar esse endereço e enviá-lo ao servidor sem confiar no preço, na disponibilidade, na taxa ou no total calculado pelo cliente.

A implementação parte do head do pull request aberto `feat/core-marketplace-flow`. Antes de integrar novas telas, o schema e a composição do servidor devem permanecer compiláveis. A correção do retorno `insertId` do Drizzle/MySQL também faz parte da estabilidade mínima do fluxo, porque um pedido só é válido quando seus itens e pagamento são persistidos com o mesmo identificador.

## Escopo

O backend deverá expor os procedimentos `addresses.list`, `addresses.create`, `addresses.update`, `addresses.delete` e `addresses.setDefault`. Cada procedimento deverá usar o usuário autenticado da sessão. O identificador enviado pelo cliente será tratado apenas como referência e sempre será filtrado por `userId` no banco.

A tela de conta deverá consumir os procedimentos de endereço e apresentar estados de carregamento, vazio, erro, criação, edição, exclusão e endereço padrão. O checkout deverá permitir escolher um endereço persistido e manter a entrada manual como fallback controlado, sem alterar a autoridade do servidor.

A criação de pedido deverá continuar recalculando os itens, os preços, a taxa de entrega e o total no backend. O cliente poderá enviar a seleção do carrinho e o endereço, mas não poderá impor os valores financeiros. A operação deverá aceitar uma chave de idempotência quando esse contrato já estiver disponível e deverá evitar duplicidade observável em novas tentativas.

## Regras de segurança

Toda leitura ou mutação de endereço deverá responder quem está autenticado e limitar o resultado ao usuário da sessão. A definição de endereço padrão deverá ser transacional ou equivalente: no máximo um endereço do usuário poderá permanecer como padrão.

A criação do pedido deverá verificar que cada produto pertence à loja selecionada e está disponível. O preço usado no item deverá ser lido do banco. A taxa e o total deverão ser calculados no servidor. Falhas durante a persistência não podem deixar um pedido sem itens ou sem o pagamento correspondente.

Dados completos de cartão não serão armazenados pelo aplicativo. O método de pagamento será uma referência ao fluxo correspondente, e integrações externas deverão confirmar o pagamento por fonte confiável.

## Ordem de implementação

1. Corrigir e alinhar o schema com as tabelas já presentes nas migrations, mantendo o build verde.
2. Implementar a camada de dados e os procedimentos autorizados de endereços.
3. Adicionar testes de isolamento entre usuários, endereço padrão e validação de entradas.
4. Integrar a conta do usuário aos procedimentos de endereço.
5. Integrar a seleção de endereço ao checkout.
6. Reforçar o contrato de criação de pedido e a extração do `insertId`.
7. Executar typecheck, testes, build, migration em banco real e o fluxo web com sessão controlada.
8. Registrar limitações nativas que não possam ser verificadas sem Android ou iOS físico.

## Critérios de aceite

A fase será considerada concluída somente quando o TypeScript, os testes e o build passarem. As migrations deverão aplicar em uma base MySQL vazia. Um usuário deverá conseguir criar e selecionar seu endereço sem enxergar endereços de outro usuário. O checkout deverá recalcular o total no servidor e criar pedido, itens e pagamento de forma consistente. Uma tentativa repetida com a mesma chave de idempotência não deverá criar uma segunda operação equivalente. O caso de endereço ausente e o caso de sessão ausente deverão produzir erros controlados, sem exceção de interface.

## Evidências a registrar

A documentação da fase deverá registrar o commit-base sincronizado, os arquivos alterados, os comandos de validação, os resultados dos testes de autorização e a evidência do fluxo integrado. Falhas encontradas durante o E2E deverão permanecer descritas mesmo depois da correção, com a causa raiz e o cenário de reprodução.

## Implementação concluída

O schema compacto do PR havia removido entidades e tipos que o backend importava. O schema foi realinhado com a versão íntegra de `main` e recebeu as tabelas de endereços, cupons, avaliações, eventos de entrega e mensagens. As migrations `0011_customer_experience_domains.sql` e `0012_order_idempotency.sql` foram incluídas. A segunda migration adiciona `idempotencyKey` e uma restrição única no pedido.

O backend agora expõe os cinco contratos de endereço previstos. As operações usam o usuário da sessão e filtram o identificador no banco. A criação do primeiro endereço o define como padrão. Definir outro padrão limpa o anterior na mesma transação. Excluir o padrão promove outro endereço quando existir.

O checkout embutido na home consulta os endereços persistidos, seleciona o padrão automaticamente e permite trocar a seleção. Quando o usuário edita o texto manualmente, a referência persistida é removida. Quando um endereço salvo é usado, o servidor reconstitui a string de entrega a partir do registro autorizado.

O servidor continua validando loja, disponibilidade e total. O valor persistido usa o total recalculado no servidor e os preços lidos do catálogo. A criação de pedido recebe uma chave de idempotência obrigatória. Um retry com a mesma chave e o mesmo cliente retorna o pedido e o pagamento já persistidos, sem inserir uma segunda operação.

Também foi corrigida a leitura de `insertId` para aceitar o formato retornado pelo Drizzle com `mysql2`. Essa correção cobre pedidos, pagamentos, lojas, produtos, clientes, lançamentos, vendas, auditoria e notificações.

## Validação executada

O `pnpm check`, o `pnpm test` e o `pnpm build` passaram. A suíte terminou com **49 testes aprovados e 1 ignorado**. O lint passou sem erros, mantendo apenas avisos preexistentes de imports não usados e dependências de hooks.

As migrations foram aplicadas em uma base MariaDB vazia. Foram confirmadas 13 migrations aplicadas e a existência das 25 tabelas esperadas, incluindo `pediu_customer_addresses` e `pediu_orders.idempotencyKey` com índice único.

No E2E real, o cliente criou um endereço padrão, outro usuário não conseguiu alterá-lo, o checkout recebeu um preço adulterado no item e ainda persistiu `23.00`, e o endereço gravado veio do registro autorizado. A repetição com a chave `e2e-order-20-1` produziu um único pedido e um único pagamento.

## Referências

[1]: ./IMPLEMENTATION_NEXT_PHASE.md "Plano da próxima fase de implementação"
[2]: ./REPO_LEVANTAMENTO_NORTE.md "Documento mestre de arquitetura e regras do repositório"
[3]: ./DOMAIN_STATE_MACHINE.md "Máquinas de estado de pedido e pagamento"
