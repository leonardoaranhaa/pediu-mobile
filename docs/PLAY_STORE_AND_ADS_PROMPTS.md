# Pediu — Prompts e briefing de assets (Play Store, onboarding, anúncios)

Documento de referência para gerar imagens de marketing, listagem na Google Play, criativos do Estúdio de Anúncios e assets de UI.

**Identidade visual**

| Token | Hex |
|-------|-----|
| Coral (primária) | `#E20D2A` |
| Canvas | `#FFF4E8` |
| Ink | `#111111` |
| Muted | `#6E635A` |
| Verde | `#0B8A5C` |
| Laranja | `#FF8A3D` |
| Amarelo | `#FFC400` |
| Branco card | `#FFFDF9` |

Mascote: personagem redondo coral, rosto amarelo/highlight, antena, cachecol com “p”, pés pretos, expressão animada (fome, curioso, feliz, celebração).

---

## 1. Textos Google Play (colar na Console)

### Título (máx. 30)
```
Pediu — Delivery local
```

### Descrição curta (máx. 80)
```
Peça, acompanhe e venda no mesmo app. Mascote, cupons e anúncios com IA.
```

### Descrição completa
```
Pediu é o delivery local que une cliente, lojista e entregador no mesmo aplicativo.

PARA QUEM PEDE
• Descubra restaurantes, mercados, farmácias e serviços perto de você
• Monte o carrinho, use cupons em Pediu Vantagens e pague com PIX ou dinheiro
• Acompanhe o pedido em tempo real, no mapa, com chat

PARA QUEM VENDE
• Publique o catálogo, receba pedidos e gerencie entregas
• Crie anúncios com IA no Estúdio de Anúncios
• Acompanhe clientes, vendas e operação em um só lugar

PARA QUEM ENTREGA
• Receba atribuições, veja ETA e se comunique com o cliente

DIFERENCIAIS
• Mascote animado e personalizável
• Temas visuais (clássico, oceano, pôr do sol)
• Pediu Vantagens com cupons reais validados no servidor
• Experiência feita para o comércio local

Baixe o Pediu e peça (ou venda) do seu jeito.
```

---

## 2. Feature Graphic (1024 × 500)

**Especificação**
- Tamanho: 1024 × 500 px
- Fundo: canvas `#FFF4E8` com faixa ou gradiente coral `#E20D2A` → `#FF8A3D`
- Logo / wordmark “Pediu” legível
- Mascote (reação happy ou celebrate) à direita
- Texto principal: **Peça. Acompanhe. Venda.**
- Texto secundário: Delivery local no mesmo app
- Sem texto miúdo, sem bordas cortadas

**Prompt (EN, geradores de imagem)**
```
Google Play feature graphic 1024x500, warm cream background #FFF4E8, coral red #E20D2A accent band, friendly round coral mascot with yellow face, antenna, scarf with letter p, smiling and celebrating, bold clean typography text "Peça. Acompanhe. Venda.", secondary line "Delivery local no mesmo app", modern Brazilian local delivery app marketing, flat illustration, high contrast, no clutter, no tiny text, professional store listing art
```

**Prompt (PT)**
```
Arte feature graphic Google Play 1024x500, fundo creme quente #FFF4E8, faixa coral #E20D2A, mascote redondo coral com rosto amarelo, antena e cachecol com p, sorrindo e celebrando, tipografia bold "Peça. Acompanhe. Venda.", subtítulo "Delivery local no mesmo app", estilo app de delivery brasileiro, ilustração clean, sem poluição visual
```

---

## 3. Screenshots Play Store (8 frames)

Tamanho alvo: **1080 × 1920** (ou 1080 × 2340). Status bar limpa. Dados de demo realistas (R$, nomes locais).

### Screenshot 1 — Home / Descoberta
**Caption:** Descubra o que tem perto de você  
**Prompt:**
```
Mobile app screenshot 1080x1920, Pediu delivery app home feed, warm cream background #FFF4E8, coral #E20D2A accents, product cards with food photos, category chips, Pediu Vantagens coupon strip, small friendly mascot, Brazilian Portuguese UI, clean modern mobile UI, no status bar clutter, realistic mock data in BRL
```

### Screenshot 2 — Produto
**Caption:** Escolha e adicione em um toque  
**Prompt:**
```
Mobile app screenshot 1080x1920, Pediu product detail screen, large food photo, price in BRL, coral primary button "Adicionar", warm cream UI #FFF4E8, coral #E20D2A, clean typography, Brazilian delivery app, realistic demo content
```

### Screenshot 3 — Carrinho
**Caption:** Carrinho transparente, sem surpresa  
**Prompt:**
```
Mobile app screenshot 1080x1920, Pediu shopping cart, list of items with prices in BRL, subtotal and total, coral CTA button, cream background #FFF4E8, modern Brazilian food delivery UI
```

### Screenshot 4 — Checkout
**Caption:** PIX ou dinheiro. Cupom aplicado.  
**Prompt:**
```
Mobile app screenshot 1080x1920, Pediu checkout screen, address card, payment options PIX and cash, applied coupon badge green, coral confirm button, cream UI #FFF4E8, Brazilian Portuguese labels
```

### Screenshot 5 — Acompanhamento
**Caption:** Do pedido à porta, em tempo real  
**Prompt:**
```
Mobile app screenshot 1080x1920, Pediu order tracking, simplified map with courier pin, status timeline preparing to delivered, chat entry, coral accents, cream background, friendly local delivery app
```

### Screenshot 6 — Painel lojista
**Caption:** Seu negócio no mesmo app  
**Prompt:**
```
Mobile app screenshot 1080x1920, Pediu seller dashboard, orders list, sales summary, shortcut to ad studio, coral #E20D2A primary, cream #FFF4E8 background, Brazilian merchant UI Portuguese
```

### Screenshot 7 — Estúdio de Anúncios
**Caption:** Anúncios com IA, prontos para publicar  
**Prompt:**
```
Mobile app screenshot 1080x1920, Pediu AI ad studio, product selected, generated headline and description in Portuguese, promotional image preview, publish button coral, cream UI, modern SaaS-like mobile screen
```

### Screenshot 8 — Personalização
**Caption:** O Pediu do seu jeito  
**Prompt:**
```
Mobile app screenshot 1080x1920, Pediu theme and mascot customization, theme swatches classic ocean sunset, animated mascot variants, cream background, coral accents, playful but clean Brazilian app UI
```

---

## 4. Onboarding — ilustrações opcionais (4 telas)

O app já usa o componente `PediuMascot` nativo. Se quiser ilustrações de fundo por slide:

### Slide 1 — PEÇA (hungry)
```
Illustration for onboarding, cream background #FFF4E8, friendly coral round mascot hungry expression sniffing, floating food and grocery category cards, soft coral and green orbs, flat modern style, no text, square 1080x1080
```

### Slide 2 — ACOMPANHE (curious)
```
Illustration for onboarding, cream background, coral mascot curious looking at delivery map path with pin, progress steps preparing to delivered, soft shadows, flat modern, no text, 1080x1080
```

### Slide 3 — VENDA (happy)
```
Illustration for onboarding, cream background, happy coral mascot with tablet showing store orders, small product catalog cards, coral accents, flat modern, no text, 1080x1080
```

### Slide 4 — SEU PEDIU (celebrate)
```
Illustration for onboarding, cream background, celebrating coral mascot with confetti dots, color theme swatches, playful scarf, flat modern, no text, 1080x1080
```

---

## 5. Templates do Estúdio de Anúncios (direção visual para IA)

Usar como `visualDirection` / prompt base ao gerar imagem promocional ligada a um produto real.

### classic
```
Promotional product ad square 1080x1080, product centered on soft coral #E20D2A gradient background, clean bold headline space top, CTA bar bottom "Pedir agora", warm cream highlights, professional food delivery ad, photoreal product, no fake logos
```

### urgency
```
Promotional product ad 1080x1080, product hero, bright yellow #FFC400 banner "Só hoje", dark ink accents, urgency retail style, coral CTA "Garantir o meu", high contrast, photoreal product
```

### local
```
Promotional product ad 1080x1080, product with stylized map pin and soft route line, text space "Perto de você", cream and coral palette, local delivery feel, photoreal product
```

### combo
```
Promotional product ad 1080x1080, two related products side by side, label space "Combo Pediu", coral frame, cream background, appetizing lighting, photoreal
```

### mascot
```
Promotional product ad 1080x1080, photoreal product, friendly coral round mascot with scarf pointing at product, happy expression, cream background, playful but premium, CTA space "Pedir agora"
```

### premium
```
Promotional product ad 1080x1080, dark elegant background near #111111, coral #E20D2A accents, refined typography space, photoreal product with soft spotlight, premium restaurant style
```

**Formatos adicionais:** repetir o mesmo prompt com `16:9 1080x608` para banner e `9:16 1080x1920` para story.

**Regras de conteúdo (produto)**
- Não inventar desconto, frete grátis ou alegação médica
- Headline ≤ 40 caracteres, descrição ≤ 90, CTA em pt-BR
- Só publicar após revisão do lojista

---

## 6. Badges e placeholders

### Badge Pediu Vantagens (240 × 64)
```
UI badge 240x64, rounded pill, green #0B8A5C background, white bold text "Pediu Vantagens", clean flat, transparent optional edges, high DPI
```

### Badge Frete grátis (200 × 56)
```
UI badge 200x56, rounded pill, coral soft #FFE7E7 background, coral #E20D2A text "Frete grátis", flat clean
```

### Badge Só hoje (160 × 56)
```
UI badge 160x56, rounded pill, yellow #FFC400 background, ink #111111 text "Só hoje", bold flat
```

### Placeholder produto (1:1)
```
Empty product placeholder 1080x1080, cream #FFF4E8, soft coral dashed frame, simple bowl or bag icon muted, centered, minimal, no text
```

### Placeholder anúncio (1:1 e 16:9)
```
Empty ad placeholder, cream background, coral outline, small mascot silhouette faint, label space "Anúncio Pediu", minimal flat
```

### Empty state sem anúncios
```
Empty state illustration 512x512, cream background, slightly sad but cute coral mascot, empty frame icon, soft green and coral orbs, flat modern, no text
```

### Loading gerando anúncio
```
Loading illustration 256x256, coral mascot thinking pose, small sparkles, cream background, flat cute, no text
```

---

## 7. Checklist de produção

- [ ] Feature graphic 1024×500
- [ ] 8 screenshots 1080×1920 (ordem da seção 3)
- [ ] Ícone / adaptive icon revisados (já existem em `assets/images`)
- [ ] Badges PNG @2x/@3x
- [ ] Placeholders produto e anúncio
- [ ] Templates classic/urgency/local/combo/mascot/premium testados no Estúdio
- [ ] Textos Play Store revisados (sem promessa financeira falsa)

## 8. Relação com o app

- Onboarding: `app/onboarding.tsx` (4 slides + mascote + swipe)
- Estúdio: `app/seller/ads.tsx` + domínio `pediu_generated_ads`
- Cores e tema: `lib/app-preferences.tsx`, `components/pediu-page.tsx`
- Mascote: `components/pediu-mascot.tsx`, `lib/mascot-scenes.ts`
