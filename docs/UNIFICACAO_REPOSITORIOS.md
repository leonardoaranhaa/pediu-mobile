# Unificação pediu-mobile + pediu2.0

## Objetivo

Dois repositórios Git, **um produto Pediu**: delivery local com cliente, lojista, entregador e backoffice, mais uma **face web** para descoberta e pedido demo.

## Divisão de responsabilidades

```text
                    ┌─────────────────────────────────────┐
                    │           Usuário final              │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   pediu2.0 (web/PWA)      pediu-mobile (Expo)      pediu-mobile (web RN)
   Zustand + catálogo      iOS / Android            Expo Web ~8081
   demo local              SecureStore + push
           │                       │
           │  (futuro: tRPC)       │
           └───────────┬───────────┘
                       ▼
              pediu-mobile/server
              Express + tRPC v11
                       ▼
                 MySQL + Drizzle
                 migrations 0000–0023
```

## Contratos compartilhados (conceituais)

Ambos os clientes implementam o mesmo **fluxo de negócio** documentado em [APP_ARCHITECTURE.md](./APP_ARCHITECTURE.md):

1. Endereço → descoberta → loja → produto → sacola  
2. Cupom, taxa, gorjeta, agendamento → pagamento → confirmação  
3. Timeline → entregador → chat → avaliação  
4. Clube / pontos (web completo; mobile em evolução)

No mobile, totais e transições são **validados no servidor**. No web, as regras de cupom, frete flash e Clube espelham o comportamento para UX consistente, persistidas em `localStorage` (`pediu-v1`).

## O que já está pronto no mobile (fonte de verdade)

Conforme [ROADMAP_EXECUCAO_UNIFICADA.md](./ROADMAP_EXECUCAO_UNIFICADA.md):

- Marketplace, carrinho, checkout idempotente, PIX, entregador com ETA  
- Chat, notificações, suporte com painel admin, reviews, LGPD  
- Modo lojista (catálogo, pedidos, entregas, fiado)  
- CI: typecheck, Vitest (~97 testes), build server, migrations em MySQL vazio  

## O que o web adiciona

- Instalação PWA, share card Pediu, preview Grok na porta **8080**  
- UI de descoberta (Flash, Mercado, Clube, Pediu Junto)  
- Demonstração completa do funil **sem** dependência de OAuth/MySQL no preview  

## Limitações conscientes

| Item | Mobile | Web |
|---|---|---|
| Login OAuth | Requer provedor configurado | Não exigido (nome local) |
| Pagamento real | PIX + webhook | Simulado |
| Dados compartilhados entre dispositivos | Sim (DB) | Não (local) |
| Lojista / admin | Sim | Não — direcionar ao app Expo |

## Checklist “app de delivery pronto”

- [x] Catálogo e busca  
- [x] Carrinho multi-item, conflito multi-loja  
- [x] Checkout com cupom, gorjeta, CPF na nota  
- [x] Acompanhamento de pedido e chat  
- [x] Histórico e avaliação  
- [x] Endereços e perfil  
- [x] Backend transacional (mobile)  
- [x] Operação lojista e entregador (mobile)  
- [ ] Integração web ↔ API (roadmap opcional)  
- [ ] MFA/recuperação (bloqueado por provedor OAuth externo)  

## Referência rápida de comandos

```bash
# Repositório mobile — validação
pnpm check && pnpm test && pnpm build

# Repositório web — validação  
npm run typecheck && npm run build
```

Veja também o [README na raiz do workspace multi-repo](../../README.md).
