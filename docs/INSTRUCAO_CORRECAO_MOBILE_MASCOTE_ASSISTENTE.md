# Instrução técnica — correção mobile do assistente, mascote e carrinho

## Objetivo

Corrigir os problemas observados no cliente Expo em viewport mobile: modal de assistente pouco refinado, mascote sem fechamento de olhos, balões desproporcionais, troca rápida de falas e emoções, duplicidade visual do mascote e carrinho persistido exibido para visitante sem sessão.

## Metodologia

A correção será conduzida em quatro frentes. Primeiro, o assistente terá uma composição mobile-first com cabeçalho contextual, ações rápidas compactas, campo de comando com estados claros e rolagem segura. Segundo, o mascote terá uma máquina de cenas com transições desaceleradas, olhos e pálpebras animados, gestos detalhados e balão limitado. Terceiro, a renderização será centralizada por contexto de tela para evitar que o mascote global apareça junto com a versão contextual de perfil, sucesso ou preferências. Quarto, o carrinho será isolado da sessão autenticada: itens antigos serão limpos quando não houver usuário ativo e a tela de carrinho oferecerá entrada segura em vez de exibir dados persistidos de outra sessão.

## Critérios de aceite

O modal de assistente deve caber em uma tela móvel comum, continuar acessível com teclado e permitir rolagem apenas quando necessário. O mascote deve fechar os olhos em cenas de sono, privacidade e alegria, sem alternar falas em intervalos agressivos. Deve existir no máximo um mascote visível por contexto, e visitantes não devem ver itens de carrinho persistidos. A validação incluirá typecheck, lint, testes, build, smoke visual no Expo e CI.


## Registro de implementação e evidência

A correção foi aplicada no cliente Expo. O modal do assistente ganhou cabeçalho contextual, botão de fechar no topo, cartão de apresentação, indicador de estado, campo compacto de comando, atalhos menores e rolagem controlada. O mascote passou a usar cenas de longa duração, agenda de piscadas, olhos fechados para alegria, sono e privacidade, pálpebras implícitas por escala, braços, mãos com dedos, bochechas, sobrancelhas e balões menores com posicionamento configurável.

A instância global do mascote é suspensa quando o perfil ou qualquer modal está ativo; o perfil e a confirmação de pedido mantêm somente a versão contextual. O carrinho foi migrado para chaves por usuário, com remoção da chave legada de visitante, limpeza no logout via eventos de sessão e bloqueio de inclusão sem autenticação. No smoke web sem sessão, `/cart` passou a mostrar “Entre para acessar seu carrinho” e nenhum item persistido.
