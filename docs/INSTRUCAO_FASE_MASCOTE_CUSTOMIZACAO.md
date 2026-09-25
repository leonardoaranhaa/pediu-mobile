# Instrução técnica — fase de personalização e mascote reativo do Pediu

## Objetivo

Evoluir a aba própria de personalização do Pediu sem substituir a identidade visual existente. A fase adiciona um estúdio de preferências com apresentação modal animada, opções de aparência e comportamento persistidas por usuário neste dispositivo, além de um mascote desenhado em componentes React Native que reage à movimentação da tela e à inclusão de produtos no carrinho.

## Diretrizes de implementação

A solução deve reutilizar os tokens de `AppTheme`, o `AppPreferencesProvider`, o carrinho global e os componentes visuais compartilhados. O mascote deve ser um protótipo determinístico em código, sem depender de download ou geração de asset externo: corpo coral, rosto circular, olhos, boca e pequenos elementos de identidade Pediu. As animações devem usar `Animated` nativo, ser sutis e respeitar a preferência de reduzir movimento.

As preferências não financeiras desta fase permanecem locais e separadas por usuário: tema, estilo do mascote, exibição do mascote, movimento e dicas contextuais. O tema continua sincronizado com o perfil remoto existente. A inclusão de um item bem-sucedida deve produzir uma reação feliz e haptic já existente; o estado normal deve comunicar fome/expectativa quando houver itens no carrinho.

## Critérios de aceite

A aba `Personalizar o Pediu` deve abrir um modal inferior com preview vivo, temas selecionáveis, estilos do mascote, toggles de movimento/exibição e ação de restauração. O modal deve fechar por gesto/ação explícita sem quebrar o histórico de navegação. O mascote deve aparecer de maneira não intrusiva no shell do cliente/lojista, flutuar com animação contínua quando permitido e reagir ao carrinho. O fluxo deve continuar utilizável em web e nativo, com fallback visual quando animações são desativadas.

## Validação

Executar `pnpm check`, `pnpm test`, `pnpm lint`, `pnpm build` e `git diff --check`. Fazer smoke visual no preview Expo, conferindo a aba de preferências, abertura do modal, troca de tema, toggles e reação após adicionar produto.


## Extensão de consciência contextual

O mascote passou a trabalhar com uma sequência programada de cenas: fome deitado, olfato com o marcador “snif”, curiosidade espiando, alongamento, cochilo com “Zzz”, dança discreta e observação. Cada cena possui duração, gesto, expressão e fala curta, com troca suave e sem depender de uma chamada de IA. Reações de produto e pedido têm prioridade sobre o roteiro: adicionar ao carrinho provoca alegria; a confirmação do pedido mostra barriga cheia e a fala “Agora sim… vou tirar um cochilo de barriga cheia.”; o perfil usa mãos sobre os olhos e a mensagem de privacidade.

Os balões são discretos, limitados por número de linhas e posicionados fora do corpo para não competir com o conteúdo principal. O shell do cliente reserva espaço para o dock flutuante, enquanto produto, carrinho, checkout, cadastro de loja, registro de venda, assistente e estúdio de preferências agora possuem altura máxima e rolagem vertical para evitar cortes em aparelhos pequenos.
