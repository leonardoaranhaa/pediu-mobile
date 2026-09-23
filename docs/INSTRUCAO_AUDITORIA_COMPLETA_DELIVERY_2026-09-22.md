# Instrução técnica — auditoria completa do aplicativo de delivery

## Objetivo

Auditar o estado atual do Pediu Mobile no branch `feat/core-marketplace-flow`, com foco na capacidade de operar como aplicativo de delivery real. A revisão deve verificar o fluxo cliente → loja → pedido → pagamento/fiado → entrega → pós-venda, além de administração, segurança, privacidade, comunicação e qualidade transversal.

## Escopo

A auditoria abrangerá a interface Expo/React Native, os routers tRPC, a camada de dados Drizzle/MySQL, migrations, autenticação e autorização, pagamentos, fiado, notificações, chat, suporte, entregas, testes, observabilidade e workflows de CI. O relatório deverá distinguir falhas confirmadas, riscos arquiteturais, lacunas de produto e limitações de validação operacional.

## Método

Primeiro será verificada a conformidade do produto com o fluxo e as regras registradas em `docs/REPO_LEVANTAMENTO_NORTE.md`. Em seguida serão rastreadas as mutations e queries do backend até suas telas consumidoras. Cada achado será confirmado com referência de arquivo e linha, impacto, cenário de reprodução e recomendação concreta.

A revisão dará prioridade a autorização, integridade financeira, consistência transacional, idempotência, isolamento entre cliente/loja/entregador/admin, tratamento de erros, concorrência, performance de consultas e cobertura de testes. Também serão executados os validadores disponíveis, mas compilação e testes unitários não serão tratados como prova de funcionamento ponta a ponta.

## Critérios de saída

O resultado será um relatório Markdown estruturado com resumo executivo, verificação de conformidade, achados críticos/altos/médios/baixos, pontos positivos, lacunas de testes, perguntas abertas, veredito e plano de correção priorizado. O relatório deverá registrar o commit auditado, os comandos executados e as limitações da evidência.
