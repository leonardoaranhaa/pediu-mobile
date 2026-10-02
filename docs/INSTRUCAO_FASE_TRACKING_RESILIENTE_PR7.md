# Instrução técnica — tracking resiliente no PR #7

## Objetivo

Fechar a parte interna da lacuna P1 de tracking: posições recebidas durante reconexão não podem voltar o marcador para trás, a API precisa informar a idade real da posição e o cliente deve distinguir posição fresca, stale, indisponível e erro de rede. O mapa cartográfico nativo, localização em background físico e push real continuam dependências externas.

## Escopo vertical

- migration `0031_tracking_captured_at` com `capturedAt` em `pediu_delivery_locations` e índice de leitura por pedido/tempo capturado;
- domínio puro de janela temporal e freshness;
- contrato de localização com `capturedAt` opcional, rejeição de timestamp futuro e amostras além da janela de reconexão;
- ordenação por tempo capturado e atualização monotônica da atribuição para impedir amostra atrasada sobrescrever posição nova;
- resposta `delivery.current` com `locationAgeSeconds` e `locationFreshness` (`fresh`, `stale`, `unavailable`);
- tela de tracking com idade, status stale/offline, retry explícito e preservação do último dado conhecido;
- smoke real contra MySQL e bundle compilado cobrindo amostra atrasada, futura, freshness e cleanup.

## Limites externos

Não instalar ou declarar homologado provedor de mapas, Google Maps/Mapbox, geocodificação, GPS/background em Android/iOS, push físico, Expo receipts, rede móvel ou dispositivos reais. A posição manual/GPS em foreground existente continua sendo a fonte de entrada; a fase torna sua persistência e exibição temporalmente seguras.

## Invariantes

1. `capturedAt` representa quando a posição foi obtida, não quando o servidor terminou de gravá-la.
2. Amostras futuras além da tolerância e amostras antigas além da janela de reconexão falham fechado.
3. Uma amostra atrasada pode ser persistida para auditoria, mas nunca substitui a posição atual mais nova da atribuição.
4. A consulta escolhe a amostra mais nova por `capturedAt`, com `id` como desempate determinístico.
5. Ausência de posição nunca é exibida como coordenada zero ou localização atual.
6. Falha de rede mantém o último dado conhecido e mostra estado de reconexão; não transforma erro em vazio.

## Gates

- baseline de deployment/stress antes da alteração;
- migration aplicada em banco temporário limpo e banco de validação;
- regressões puras, router e banco real;
- `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier nos formatos suportados e `git diff --check`;
- bundle de produção com health/readiness, smoke E2E e stress 120/12;
- deployment smoke/stress HTTPS temporário;
- CI e Operational Validation verdes antes da próxima fase.

## Pendências externas

PSP/PIX/CNPJ, OAuth, Expo Push Service/receipts, mapas, GPS/background, dispositivos Android/iOS, domínio/staging/produção, storage, e-mail/SMS, observabilidade/backup, scheduler/hosting e publicação nas lojas continuam pendentes. O PR #7 não deve ser declarado READY comercial.

## Evidências executadas — 02/10/2026

| Validação                          | Resultado                                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Migration limpa                    | Banco MySQL temporário `pediu_go_live_phase47_fresh`; 32 migrations aplicadas e `capturedAt` presente                            |
| Migration de validação             | `0031_tracking_captured_at` aplicada no banco real local; índice temporal confirmado                                             |
| Regressões focadas                 | 12 testes aprovados em tracking-domain e delivery-router                                                                         |
| Matriz local final                 | 44 arquivos, 219 testes aprovados; `pnpm check`, `pnpm test`, `pnpm build`, `pnpm lint`, Prettier e `git diff --check` aprovados |
| Smoke E2E real                     | Amostra recente, amostra atrasada, rejeição futura, freshness/stale e cleanup aprovados no bundle de produção                    |
| Monotonicidade                     | Amostra atrasada persistida sem sobrescrever coordenada mais nova da atribuição                                                  |
| Cleanup SQL                        | 0 usuários, 0 pedidos e 0 localizações com prefixo da fase residuais                                                             |
| Readiness final                    | `/api/health` 200 e `/api/readyz` 200 com database, migrations e tables em `pass`                                                |
| Deployment smoke local             | health 200, readyz 200, marketplace 200, CORS exato e métricas protegidas                                                        |
| Stress local read-only             | 120 requests / 12 workers; p50 21,6 ms; p95 59,0 ms; máximo 101,0 ms; erro 0%                                                    |
| Deployment/stress HTTPS temporário | Smoke aprovado; 40 requests / 4 workers; p50 13,6 ms; p95 49,6 ms; máximo 145,5 ms; erro 0%                                      |

A implementação não homologa mapa cartográfico, GPS/background físico, rede móvel, push real ou dispositivos Android/iOS. Esses itens permanecem externos e precisam de evidência própria antes do Go-Live comercial.
