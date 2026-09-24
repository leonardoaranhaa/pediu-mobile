# iOS platform setup

Gere os diretórios Android/iOS com `flutter create .` dentro de `flutter_app/` caso eles ainda não existam. No projeto iOS gerado, registre o URL scheme `pediu` em `CFBundleURLTypes` do `Info.plist` ou nas configurações do Runner. O plugin `app_links` recebe então `pediu://oauth/callback?code=...&state=...`.
