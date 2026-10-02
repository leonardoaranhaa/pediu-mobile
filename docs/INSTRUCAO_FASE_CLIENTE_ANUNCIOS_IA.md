# Instrução técnica — fase cliente visual e anúncios personalizados com IA

## Objetivo

Evoluir o Pediu em duas frentes conectadas: tornar a descoberta do cliente mais visual e orientada à conversão, e oferecer ao lojista uma ferramenta interna para criar anúncios personalizados com inteligência artificial. A experiência deve gerar valor simultâneo para cliente, lojista, plataforma e entregador, sem esconder taxas, inventar benefícios ou prometer resultado financeiro.

## Hipótese de produto

O cliente compra primeiro com os olhos e precisa encontrar produtos relevantes, imagens atraentes, ofertas compreensíveis e uma sensação de vantagem legítima. O lojista precisa transformar um produto real do catálogo em um criativo pronto, com texto e imagem coerentes, sem sair do Pediu para usar outra ferramenta. A plataforma pode monetizar a geração por créditos ou plano comercial, enquanto preserva uma camada gratuita de experimentação e um orçamento promocional controlável pelo lojista.

## Entregas da fase

1. Criar o domínio persistido de anúncios da loja, com vínculo obrigatório ao lojista e, quando aplicável, ao produto.
2. Gerar headline, descrição, chamada para ação e prompt visual em português por saída estruturada de IA.
3. Gerar uma imagem promocional por anúncio utilizando a infraestrutura interna de imagem, sem expor chaves ao cliente.
4. Controlar créditos de geração por conta, impedir uso sem saldo e aplicar limite de frequência/concurrency no servidor.
5. Permitir ao lojista visualizar, publicar e arquivar anúncios gerados.
6. Exibir anúncios publicados no marketplace com imagem, destaque visual e fallback seguro quando a mídia não estiver disponível.
7. Introduzir a linguagem de “Pediu Vantagens” para cupons, recompensas e ofertas financiadas de forma transparente, sem prometer cashback inexistente nesta etapa.
8. Melhorar a vitrine do cliente com criativos, hierarquia visual, oferta clara e CTA de compra.

## Regras de segurança e qualidade

A geração ocorre somente no servidor e nunca recebe credenciais no aplicativo. O servidor deve validar propriedade da loja e do produto, limitar tamanho dos campos, higienizar o texto recebido e bloquear alegações médicas, garantias absolutas ou descontos não informados pelo lojista. O anúncio só aparece para clientes quando estiver explicitamente publicado e ligado a um produto disponível.

A imagem gerada é armazenada por chave privada e entregue ao cliente por URL assinada. O cliente deve funcionar mesmo quando o serviço de IA estiver indisponível, mostrando o produto sem imagem gerada e uma mensagem acionável. Falhas de geração não devem consumir crédito de forma definitiva.

## Modelo econômico inicial

A primeira versão utiliza créditos de criação por conta para validar uso e custo. A cobrança real deve evoluir para pacotes ou assinatura do lojista, com preço e limites configuráveis; não deve ser simulada como pagamento confirmado nesta fase. Benefícios do cliente devem ser financiados por regras de cupom/orçamento do lojista e pela margem da plataforma, com taxa de entrega e comissão apresentadas de forma transparente. Incentivos ao entregador devem ser uma camada operacional posterior, condicionada a entrega concluída e sem reduzir a remuneração-base.

## Critérios de aceite

- O cliente vê produtos reais com imagem de anúncio quando houver anúncio publicado.
- O lojista consegue gerar um criativo ligado a um produto, revisar, publicar e arquivar.
- A saída de texto tem formato estruturado, limites de tamanho e idioma pt-BR.
- Créditos e autorização são controlados no backend.
- Não existem chaves de IA, URLs de storage privadas ou operações financeiras no cliente.
- `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build` e `git diff --check` passam.
- Migração limpa em MariaDB valida as novas tabelas e FKs.
- O preview Expo continua funcional sem configuração de IA, usando fallback visual.

## Limitações deliberadas

A fase não confirma cobrança real de créditos nem processa cashback em dinheiro. Ela cria a fronteira de produto, o catálogo de anúncios e a experiência de geração. Antes de comercializar, será necessário adicionar checkout de créditos, política de conteúdo, moderação, métricas de impressão/conversão, orçamento de promoções e reconciliação financeira.

## Registro de implementação e validação

A fase foi implementada no branch `feat/customer-ai-ads`. O backend contém `pediu_ad_credits` e `pediu_generated_ads`, a rota protegida `pediu.ads` e a rota pública `pediu.coupons.available`. O cliente Expo ganhou `app/seller/ads.tsx`, a vitrine do cliente passou a consumir imagens/copy de anúncios publicados e `app/coupons.tsx` direciona cupons para a cotação real do checkout.

A migration limpa foi aplicada em MariaDB com **36 tabelas, 52 chaves estrangeiras e 2 tabelas de IA**. A matriz local passou com **27 arquivos de teste aprovados, 1 arquivo ignorado, 101 testes aprovados e 1 ignorado**, além de typecheck, build e lint verdes. O smoke test do preview Expo confirmou a faixa Pediu Vantagens na descoberta, o marketplace respondendo com o contrato novo e a rota do estúdio protegendo o acesso sem sessão.

A geração de IA depende de `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY`; sem essas variáveis o serviço falha de forma explícita antes de consumir o crédito. A cobrança comercial de créditos permanece deliberadamente fora desta fase e deve ser adicionada antes de transformar o saldo inicial em produto pago.
