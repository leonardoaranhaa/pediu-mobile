# Instrução Técnica — Jornadas integradas cliente, prestador e motoboy

## Objetivo
Validar verticalmente se um pedido percorre corretamente as três perspectivas operacionais do Pediu: cliente, prestador/lojista e motoboy/entregador. A fase deve testar contratos reais do backend, autorização por papel, persistência MySQL, transições do pedido, atribuição de entrega, rastreamento e visibilidade coerente para cada participante.

## Escopo funcional

1. **Cliente:** consultar marketplace, cotar checkout, criar pedido com idempotência, receber o pedido, consultar status/tracking e avaliar após conclusão.
2. **Prestador/lojista:** criar ou possuir loja, publicar produto, receber o pedido, consultar a fila operacional, atribuir o entregador quando aplicável e avançar o estado permitido.
3. **Motoboy/entregador:** cadastrar perfil, passar pela aprovação/eligibilidade, receber oferta, aceitar a entrega, enviar localização/eventos e concluir o transporte.
4. **Segurança:** impedir que um papel leia ou altere dados de outro sem relação válida; impedir acesso anônimo a mutations protegidas; impedir tracking de retirada/pickup e localização fora da janela autorizada.
5. **Consistência:** recalcular preço no servidor, reservar estoque transacionalmente, preservar idempotência e manter o pedido visível somente aos participantes autorizados.

## Metodologia

A validação será feita em duas camadas. A primeira usa Vitest e callers tRPC com fixtures controladas para exercitar o fluxo completo em uma única sessão: cliente → lojista → motoboy → cliente. A segunda usa o backend WebDev persistente para health/readiness, rotas HTTP, smoke da API e stress bounded sem modificar dados comerciais reais fora do ambiente de validação.

Cada cenário deve registrar: atores e papéis, mutations executadas, estado esperado antes/depois, autorização esperada, identificadores de pedido/oferta/atribuição e qualquer warning operacional. Falhas de notificações externas ou push devem ser distinguidas de falhas no núcleo transacional.

## Critérios de aprovação

| Área | Critério |
| --- | --- |
| Cliente | Pedido criado com total server-side, estoque reservado e chave idempotente respeitada |
| Prestador | Pedido aparece para a loja correta e só ela pode operar sua entrega/catalogo |
| Motoboy | Somente entregador elegível recebe/aceita oferta e atualiza tracking próprio |
| Entrega | Atribuição, aceite, eventos e conclusão respeitam a máquina de estados |
| Segurança | Atores não relacionados recebem rejeição e não obtêm dados de terceiros |
| Pós-venda | Cliente consegue consultar pedido finalizado e avaliar o entregador relacionado |
| Operação | API health/readiness, migrations e tabelas permanecem verdes |
| Regressão | Suíte completa, build, lint e diff passam |

## Fora do escopo

Não serão disparados pagamentos reais, webhooks de PSP, publicação, EAS, Google Play ou credenciais externas. Também não serão alterados schema/migrations sem evidência de falha e revisão específica.

## Entregáveis

- Teste vertical automatizado cobrindo cliente, prestador e motoboy.
- Testes de autorização e isolamento entre papéis.
- Relatório técnico com resultados, limitações e falhas encontradas.
- Sincronização WebDev/checkpoint apenas se o código e todos os gates estiverem verdes.
