## Cofre local criado

Foi criado o diretório protegido `~/.config/pediu` fora do repositório. O arquivo `eas-preview.env` é reservado para os valores de preview e deve permanecer com permissão `600`; o carregador `load-eas-preview-env.sh` valida a presença do token, exige API HTTPS estável, rejeita localhost/sandbox temporária e exporta somente para o processo filho do EAS CLI. Nenhum valor secreto foi gravado nesta etapa.

Uso previsto após a injeção dos valores:

```bash
cd /home/ubuntu/pediu-mobile
./scripts/configure-eas-preview.sh
source ~/.config/pediu/load-eas-preview-env.sh
eas project:info
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

A injeção deve ocorrer no arquivo seguro ou no gerenciador de segredos da sandbox, nunca em `.env` versionado, no chat, no log do terminal ou no bundle público.
