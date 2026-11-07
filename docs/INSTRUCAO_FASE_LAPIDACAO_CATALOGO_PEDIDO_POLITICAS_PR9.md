# Instrução Técnica — Catálogo, busca, pedido e políticas do Pediu

## Objetivo

Refinar a interface de cliente e lojista nas jornadas de catálogo, descoberta, pedido, rastreamento, entrega e fiado, sem alterar os contratos server-side nem criar estados simulados.

## Escopo

1. Padronizar placeholders, categorias locais e estados vazios do catálogo do lojista.
2. Tornar a busca mais clara para comida, mercado, serviços, Flash e filtros de preço.
3. Traduzir status/eventos operacionais do pedido para rótulos amigáveis ao cliente, mantendo os valores de domínio intactos.
4. Explicar no checkout como a taxa, disponibilidade, retirada, Flash e entrega de Mercado são determinados.
5. Exibir no módulo de fiado limite, saldo em aberto, limite disponível e regra de bloqueio com linguagem explícita.
6. Manter coordenadas e localização do courier protegidas; o cliente verá somente o estado e a última atualização autorizada.

## Regras de produto preservadas

- Preço, estoque, disponibilidade, taxa, cupom, total e transição de pedido continuam sendo calculados/validados pelo servidor.
- `Pendente`, `Aceito`, `Preparando`, `Pronto`, `A caminho`, `Entregue` e `Cancelado` permanecem os valores persistidos; somente os rótulos apresentados mudam.
- Mercado continua delivery-first; retirada não será reintroduzida na UI.
- Fiado continua restrito à conta de crédito persistida da loja, com limite disponível calculado como limite menos saldo em aberto e bloqueio server-side.
- Não serão criadas migrations, seeds, bypass de OAuth ou alterações de autorização nesta fase.

## Validação

Rodar testes puros de copy/status, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint` e `git diff --check`; sincronizar para `/home/ubuntu/pediu-app`, reiniciar API/Metro, testar as rotas de catálogo, busca, pedido e rastreamento via WebDev e executar stress bounded de health. Salvar checkpoint apenas após todos os gates.
