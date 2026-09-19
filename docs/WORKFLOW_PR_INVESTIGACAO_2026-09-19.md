# Investigação do workflow do pull request — 2026-09-19

## Objetivo

Identificar a causa da falha do workflow associada ao pull request aberto do repositório `leonardoaranhaa/pediu-mobile`, corrigir o problema no branch do pull request e validar a correção com as mesmas verificações do CI.

## Metodologia

1. Ler o documento mestre `docs/REPO_LEVANTAMENTO_NORTE.md` e preservar o ciclo do projeto: levantamento, implementação em branch própria, validação estática, testes automatizados, validação operacional possível e registro de limitações.
2. Consultar o GitHub para identificar o pull request aberto, o commit exato avaliado e o workflow/run que falhou.
3. Reproduzir localmente os comandos do workflow usando as versões e scripts declarados pelo projeto.
4. Inspecionar o diff do pull request, os arquivos de configuração do CI e o log completo do job que falhou.
5. Implementar a menor correção suficiente, evitando alterações não relacionadas ao erro.
6. Executar TypeScript, lint quando aplicável, testes e build; registrar qualquer etapa que dependa de banco, segredo, dispositivo ou serviço externo.
7. Atualizar o branch do pull request e confirmar a criação de uma nova execução do workflow.

## Diagnóstico

O alvo foi o PR #2, `feat: concluir fase 5 de notificações do Norte`, no branch `feat/norte-phase-5-6`. As execuções `35451607036` e `35451604233` falharam no job `mysql-and-api-smoke`, na etapa de aplicação das migrations.

A causa raiz foi a migration `drizzle/0005_delivery_fiado_core.sql`. Ela continha 13 instruções `ALTER TABLE` separadas apenas por quebras de linha. O `drizzle-kit migrate` envia cada migration como uma unidade; sem os marcadores `--> statement-breakpoint`, o driver MySQL recebeu as 13 instruções em uma única query e retornou `ER_PARSE_ERROR` na segunda instrução (`ALTER TABLE ...`).

O commit anterior havia separado corretamente apenas as instruções da migration `0006_marketplace_financial_domain.sql`, deixando a migration `0005` ainda incompatível com a execução MySQL usada no CI.

## Correção

Foram adicionados marcadores `--> statement-breakpoint` entre todas as 13 instruções da migration `0005_delivery_fiado_core.sql`. Nenhuma regra de negócio, tabela ou instrução SQL foi removida ou alterada; apenas a unidade de execução foi corrigida.

Também foi criado este documento para registrar a investigação e seus critérios de aceite.

## Validação

- `pnpm install --frozen-lockfile`: aprovado.
- `pnpm check`: aprovado.
- `pnpm test`: aprovado — 9 arquivos passaram; 36 testes passaram; 1 teste foi pulado por depender de autenticação externa.
- `pnpm build`: aprovado.
- `pnpm lint`: não faz parte do workflow CI atual e não foi usado como critério do workflow.
- Migration contra MySQL local: não executada, porque este sandbox possui o cliente `mysql`, mas não possui servidor MySQL ou Docker disponível.
- Validação operacional no GitHub: será confirmada após o push da correção, por meio de uma nova execução do workflow no PR.

## Critérios de aceite

- A causa raiz da falha está identificada e documentada.
- A correção está aplicada no branch do pull request.
- `pnpm check`, `pnpm test` e `pnpm build` passam localmente, ou falhas ambientais ficam explicitamente registradas.
- O workflow do pull request é reexecutado com a correção.
- Não há mudanças de banco ou de comportamento além do necessário para corrigir o CI.
