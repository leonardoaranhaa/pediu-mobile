# Fase de redesign visual total do Pediu

## Objetivo

Modernizar a experiência visual do aplicativo sem alterar os contratos de negócio já validados. A fase prioriza hierarquia visual, navegação flutuante, estados de ação, modais em formato de bottom sheet, feedback de toque e movimento sutil de elementos decorativos.

## Diretrizes

A interface usará uma linguagem de marketplace local: fundo quente e leve, azul petróleo para contraste, coral como ação primária, superfícies arredondadas, sombras discretas, chips de filtro e cartões com leitura rápida. Elementos animados terão movimento curto e funcional, evitando excesso de bounce ou distração.

## Escopo

A camada compartilhada receberá novos tokens e superfícies. A home será atualizada com dock flutuante, ação central elevada, destaque de localização, busca e cards de produto. Pedidos, perfil e modo vendedor receberão a mesma linguagem visual. Os modais existentes serão tratados como bottom sheets consistentes, com backdrop, handle e ação primária clara.

## Critérios de aceite

O fluxo de descoberta, carrinho, checkout, pedidos, perfil e vendedor continuará funcional. A reformulação deverá passar por typecheck, testes, build, lint, smoke test no Expo Web e validação dos workflows do PR.

## Limitações

Não serão introduzidos assets externos nem dependências visuais novas nesta etapa. O redesign será implementado com React Native, Expo, Material Icons e animações nativas já presentes no projeto.

## Implementação realizada

A camada compartilhada recebeu superfícies translúcidas, sombras discretas, orbes decorativos, cabeçalhos mais expressivos, botões com presença e cartões elevados. A home ganhou hero de descoberta local, chips de contexto, ação de assistente central elevada, dock inferior flutuante em formato pill, movimento sutil de elementos decorativos e modais com bottom sheet mais consistente.

As telas dedicadas de pedidos e perfil receberam o mesmo tratamento, com hero contextual, estados de visitante mais claros, chips de identidade e seção de acessos rápidos. A lógica de catálogo, carrinho, checkout, autenticação, pedidos e modo vendedor foi preservada.

## Evidências e validação

O smoke test no Expo Web abriu a home, `/orders` e `/account/profile` com a nova linguagem visual sem telas de erro. A validação automatizada passou com 83 testes aprovados e 1 ignorado, typecheck, build, lint e `git diff --check` sem falhas. O único aviso do lint é o warning não bloqueante preexistente sobre `MODULE_TYPELESS_PACKAGE_JSON`.
