# Android platform setup

Gere os diretórios Android/iOS com `flutter create .` dentro de `flutter_app/` caso eles ainda não existam. Depois adicione ao `android/app/src/main/AndroidManifest.xml`, dentro da activity principal, o intent-filter do esquema `pediu`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="pediu" android:host="oauth" />
</intent-filter>
```

O plugin `app_links` recebe então `pediu://oauth/callback?code=...&state=...`.
