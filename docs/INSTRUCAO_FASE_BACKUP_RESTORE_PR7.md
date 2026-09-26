# Instrução técnica — backup e restauração para o Go-Live do PR #7

## Objetivo

Adicionar uma verificação executável de recuperação do MariaDB antes de avançar para novas etapas do Go-Live. O teste deve criar um backup lógico da base atual, restaurá-lo em uma base temporária isolada, comparar a estrutura e os dados essenciais e remover somente os artefatos temporários.

## Escopo

O comando `pnpm go-live:backup-restore` usa `mysqldump` com `--single-transaction`, `--quick`, rotinas, eventos e triggers. A restauração ocorre via cliente `mysql` em um banco temporário cujo nome é validado contra traversal e caracteres inesperados. A base de origem nunca é apagada, truncada ou alterada pelo smoke.

O aceite compara a quantidade de tabelas, o número de migrations no journal e as contagens de linhas de `users`, lojas, pedidos, pagamentos, atribuições de entrega, perfis courier e ofertas de entrega. A credencial usada precisa ter permissão para criar e remover o banco temporário; em produção, isso deve ser uma credencial operacional separada da credencial da aplicação e protegida pelo ambiente de CI/CD.

## Segurança operacional

O script não imprime URL de banco, senha, dump ou conteúdo de dados. O dump é criado em arquivo temporário, consumido pela restauração e removido em `finally`. O banco temporário também é removido em caso de sucesso ou falha. O modo obrigatório é ativado somente com `BACKUP_RESTORE_REQUIRED=1`; execuções ad hoc podem usar `BACKUP_RESTORE_RUN=1`.

Para um ambiente que separa credenciais administrativas, use `BACKUP_RESTORE_ADMIN_DATABASE_URL` apontando para o servidor e uma base na qual a conta possa executar `CREATE DATABASE` e `DROP DATABASE`. Em nenhum caso o alvo deve ser a base de produção original.

## Gates obrigatórios

Esta etapa só é considerada concluída quando o smoke de backup/restore passa contra MariaDB real, seguido pela matriz de typecheck, testes, build, lint e whitespace, pelo deployment smoke e pelo estresse read-only. O workflow `Pediu Operational Validation` executa o smoke após as migrations e antes de iniciar a API.

A existência deste smoke não configura backup agendado, retenção, armazenamento externo, criptografia em repouso, monitoramento de falhas ou restauração de produção. Esses itens continuam sendo responsabilidades do provedor de infraestrutura e permanecem P0 antes do Go-Live comercial.


## Evidência executada — 26/09/2026

O smoke local passou em MariaDB real com 37 tabelas, 25 migrations e sete contagens críticas comparadas. O banco temporário e o arquivo de dump foram removidos após a execução. A matriz `pnpm check`, `pnpm test` (105 passed, 1 skipped), `pnpm build`, `pnpm lint`, Prettier e `git diff --check` passou. Em seguida, um bundle `NODE_ENV=production` foi iniciado na porta 3003; o deployment smoke passou com health 200, marketplace 200 e CORS exato, e o stress read-only passou com 120 requests, concorrência 12, p95 de 73,4 ms, máximo de 85,7 ms e erro 0%.
