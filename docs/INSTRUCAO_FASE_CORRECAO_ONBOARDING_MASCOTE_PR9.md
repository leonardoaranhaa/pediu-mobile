# Instrução Técnica — Correção do encerramento do onboarding e do balão do mascote

## Problemas observados

Ao concluir a quarta tela, o estado de primeiro acesso era persistido, mas o layout raiz ainda podia avaliar o pathname `/login` com o estado local `completed=false` antes de a navegação estabilizar. Isso fazia o guard redirecionar novamente para `/onboarding`, aparentando que o fluxo reiniciava na primeira tela.

No mascote, o balão era `position: absolute` e recebia apenas `left` ou `right`, sem posição vertical. Como o desenho usa um contêiner de 104px, o balão era renderizado na origem do contêiner e atravessava olhos e rosto.

## Correção planejada

1. Tratar as rotas de autenticação (`/login`, `/register`, `/forgot-password` e `/auth/mfa`) como destinos isentos do gate, além de `/onboarding` e `/oauth/callback`.
2. Manter a gravação assíncrona do marcador antes do `router.replace`, sem alterar o contrato do servidor.
3. Posicionar o balão acima do mascote com deslocamento vertical explícito e manter a cauda apontando para o personagem.
4. Preservar o balão compacto, as reações, o movimento reduzido, as animações de cena e o comportamento nativo/web.

## Validação

- Testes puros do gate devem cobrir as rotas de autenticação e impedir regressão do loop.
- TypeScript, Vitest, build, lint e diff devem passar.
- O preview WebDev deve responder em `/onboarding`, `/login`, `/api/health` e `/api/readyz` sem erro novo de bundle.
- A captura visual deve mostrar o balão acima/lateral do mascote, sem cruzar o rosto.
