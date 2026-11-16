#!/usr/bin/env bash
# Rebuild the native Electron package from ../app. Output: dist/lisa-island-linux-x64.tar.gz
set -eu
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"
[ -f ../app/index.html ] || { echo "../app/index.html missing"; exit 1; }
export NODE_ENV=development
if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi
rm -rf build dist
mkdir -p build/src dist
cp main.js build/src/main.js
cp package.json build/src/package.json
# Fresh copy of the game at build time (no node_modules inside app/).
cp -r ../app build/src/game
npx --no-install electron-packager build/src lisa-island --platform=linux --arch=x64 --out=dist --overwrite --no-prune
tar -C dist -czf dist/lisa-island-linux-x64.tar.gz lisa-island-linux-x64
ls -lh dist/lisa-island-linux-x64.tar.gz
