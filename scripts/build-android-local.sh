#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PEDIU_ANDROID_ENV_FILE:-$HOME/.config/pediu/android-sdk.env}"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Ambiente Android ausente: $ENV_FILE" >&2
  echo "Configure o SDK ou defina PEDIU_ANDROID_ENV_FILE." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"
: "${JAVA_HOME:?JAVA_HOME não definido}"
: "${ANDROID_HOME:?ANDROID_HOME não definido}"
: "${ANDROID_SDK_ROOT:?ANDROID_SDK_ROOT não definido}"

cd "$ROOT_DIR"

if [[ ! -x android/gradlew ]]; then
  echo "Projeto Android nativo ausente; executando Expo prebuild..."
  CI=1 npx expo prebuild --platform android --no-install
fi

cd android
export CI=1
export GRADLE_OPTS="${GRADLE_OPTS:--Dorg.gradle.daemon=false -Dorg.gradle.parallel=true -Dorg.gradle.caching=true}"
./gradlew :app:assembleDebug --no-daemon --console=plain

APK="$PWD/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -s "$APK" ]]; then
  echo "APK não foi gerado: $APK" >&2
  exit 1
fi

printf 'APK: %s\n' "$APK"
stat -c 'Tamanho: %s bytes' "$APK"
printf 'SHA-256: '
sha256sum "$APK" | cut -d' ' -f1
