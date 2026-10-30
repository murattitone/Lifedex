#!/usr/bin/env bash
# Builds an installable release APK locally (Linux). Needs JDK 17+ and access to dl.google.com.
# Usage: bash scripts/build-apk.sh   → output: build/hayat.apk
set -euo pipefail
cd "$(dirname "$0")/.."

export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
SDKM="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

if [ ! -x "$SDKM" ]; then
  echo "→ Android command-line tools indiriliyor"
  zip=$(curl -fsSL https://dl.google.com/android/repository/repository2-3.xml | grep -o 'commandlinetools-linux-[0-9]*_latest.zip' | sort -V | tail -1)
  tmp=$(mktemp -d)
  curl -fsSL "https://dl.google.com/android/repository/$zip" -o "$tmp/clt.zip"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  unzip -q "$tmp/clt.zip" -d "$tmp"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$tmp/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
fi

echo "→ SDK lisansları kabul ediliyor"
yes | "$SDKM" --licenses >/dev/null || true
"$SDKM" "platform-tools" >/dev/null

[ -d android ] || npx expo prebuild --platform android --no-install
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "→ Gradle derlemesi (eksik SDK/NDK paketleri otomatik iner)"
(cd android && ./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a,armeabi-v7a)

mkdir -p build
cp android/app/build/outputs/apk/release/app-release.apk build/hayat.apk
echo "✓ build/hayat.apk hazır ($(du -h build/hayat.apk | cut -f1))"
