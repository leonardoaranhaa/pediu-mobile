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

O alvo foi o PR #2, `feat: concluir fase 5 de notificações do Norte`, no branch `feat/norte-phase-5-6`.

A primeira execução falhava na migration `drizzle/0005_delivery_fiado_core.sql`. Ela continha 13 instruções `ALTER TABLE` separadas apenas por quebras de linha. O `drizzle-kit migrate` envia cada migration como uma unidade; sem os marcadores `--> statement-breakpoint`, o driver MySQL recebeu as 13 instruções em uma única query e retornou `ER_PARSE_ERROR` na segunda instrução.

Depois que os separadores foram adicionados, a execução avançou para a migration `drizzle/0006_marketplace_financial_domain.sql` e revelou uma segunda causa independente: as oito tabelas financeiras declaravam uma coluna `id` com `AUTO_INCREMENT`, mas não declaravam `PRIMARY KEY`. O MySQL rejeitou a primeira tabela com `ER_WRONG_AUTO_KEY` e a mensagem `there can be only one auto column and it must be defined as a key`.

Depois que as chaves primárias foram adicionadas, as migrations foram aplicadas com sucesso, mas a etapa `Verify migrated schema` do workflow falhou por um terceiro problema: o workflow exigia uma tabela chamada `pediu_users`, embora a migration e o schema real usem `users`. A consulta também usava `SHOW TABLES LIKE 'pediu_%'`, que nunca poderia retornar a tabela `users` sem prefixo.

## Correções

Foram adicionados marcadores `--> statement-breakpoint` entre todas as 13 instruções da migration `0005_delivery_fiado_core.sql`.

Foram adicionadas as chaves primárias `id` às oito tabelas da migration `0006_marketplace_financial_domain.sql`, preservando as constraints únicas existentes e alinhando a migration ao schema Drizzle.

A etapa de verificação do workflow foi corrigida para consultar todas as tabelas com `SHOW TABLES` e exigir o nome real `users`, mantendo as demais tabelas `pediu_*` esperadas.

Nenhuma regra de negócio, coluna ou tabela foi removida. As alterações corrigem somente a execução das migrations, a definição estrutural financeira e a verificação do schema no CI.

Este documento registra a investigação, as causas sequenciais e os critérios de aceite.

## Validação

- `pnpm install --frozen-lockfile`: aprovado.
- `pnpm check`: aprovado.
- `pnpm test`: aprovado — 9 arquivos passaram; 36 testes passaram; 1 teste foi pulado por depender de autenticação externa.
- `pnpm build`: aprovado.
- `pnpm lint`: não faz parte do workflow CI atual e não foi usado como critério do workflow.
- Migration contra MySQL local: não executada, porque este sandbox possui o cliente `mysql`, mas não possui servidor MySQL ou Docker disponível.
- GitHub Actions no commit `bf0fbcf`: migrations aplicadas com sucesso; a falha ocorreu somente na verificação de nome de tabela, corrigida neste commit.
- Validação operacional completa no GitHub: pendente da nova execução após o push desta correção.

## Critérios de aceite

- As causas raiz estão identificadas e documentadas.
- As correções estão aplicadas no branch do pull request.
- `pnpm check`, `pnpm test` e `pnpm build` passam localmente, ou falhas ambientais ficam explicitamente registradas.
- O workflow do pull request é reexecutado com as correções.
- Não há mudanças de negócio além do necessário para tornar as migrations e suas verificações compatíveis com MySQL.
