# Fase de assistente, localização automática e personalização

## Objetivo

Aprimorar a experiência de descoberta do Pediu com um assistente mais expressivo, localização automática convertida em endereço completo e um perfil personalizável. A proposta mantém a mensagem de produto: **o app de delivery de sempre, só que do seu jeito**.

## Metodologia

A implementação será vertical e reutilizará as capacidades existentes de Expo, `expo-location`, `AsyncStorage`, Material Icons e animações nativas. O assistente receberá feedback de pulso, estados de escuta e ações rápidas visualmente agrupadas. A localização será resolvida por permissão foreground, leitura de coordenadas e `reverseGeocodeAsync`, com fallback controlado e edição manual. A personalização será persistida localmente em um provider único, oferecendo três identidades visuais: Pediu original, Onda local e Pôr do sol.

## Critérios de aceite

O botão de localização deverá informar o estado da captura e exibir rua, número, bairro, cidade e região quando o geocoder retornar esses campos. O modal do assistente deverá deixar clara a ação principal, o estado de escuta e os atalhos. O perfil deverá expor a personalização e a escolha de tema deverá sobreviver à navegação e à reabertura do app.

A lógica de autenticação, catálogo, carrinho, checkout, pedidos e vendedor não será alterada. A validação incluirá typecheck, testes, build, lint e smoke test no Expo Web; a captura GPS será validada no caminho nativo e terá comportamento seguro no Web Preview.
