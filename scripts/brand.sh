#!/usr/bin/env bash
# Gera todos os PNGs da marca a partir de assets/brand/*.svg e depois os ícones e splashes
# de Android/iOS (@capacitor/assets) e da PWA (@vite-pwa/assets-generator).
set -euo pipefail
cd "$(dirname "$0")/.."
r() { node scripts/render-brand.mjs "$@"; }
mkdir -p assets/brand/png

# fontes para o @capacitor/assets (nomes que ele espera)
r assets/brand/icon-square.svg      assets/icon-only.png        1024
r assets/brand/icon-foreground.svg  assets/icon-foreground.png  1024 1024 --transparent
r assets/brand/icon-background.svg  assets/icon-background.png  1024
r assets/brand/splash.svg           assets/splash.png           2732
r assets/brand/splash-dark.svg      assets/splash-dark.png      2732

# peças de marca para loja, site e redes
r assets/brand/mark.svg                 assets/brand/png/mark-1024.png            1024 1024 --transparent
r assets/brand/icon-square.svg          assets/brand/png/store-icon-512.png       512
r assets/brand/glyph.svg                assets/brand/png/glyph-1024.png           1024 1024 --transparent
r assets/brand/logo-horizontal.svg      assets/brand/png/logo-horizontal.png      2400 720 --transparent
r assets/brand/logo-horizontal-dark.svg assets/brand/png/logo-horizontal-dark.png 2400 720 --transparent
r assets/brand/feature-graphic.svg      assets/brand/png/play-feature-graphic.png 1024 500

npx --yes @capacitor/assets@3 generate --android --ios \
  --iconBackgroundColor '#1E1A16' --iconBackgroundColorDark '#1E1A16' \
  --splashBackgroundColor '#F3EEE4' --splashBackgroundColorDark '#16130F'

# o @capacitor/assets reformata o manifesto sem mudar nada: desfaz o ruído no diff
git checkout -- android/app/src/main/AndroidManifest.xml 2>/dev/null || true

cp assets/brand/mark.svg public/icon.svg
npx pwa-assets-generator --preset minimal-2023 public/icon.svg
