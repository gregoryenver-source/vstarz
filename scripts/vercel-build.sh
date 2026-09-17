#!/usr/bin/env bash
# Vercel production build for the /vstarz subpath mount.
# Exports the subpath base + public Convex URL, builds, then mirrors the
# output under dist/vstarz/ so every /vstarz/... path exists on disk.
set -euo pipefail

export VITE_APP_BASE=/vstarz/
export VITE_CONVEX_URL=https://combative-kookabura-535.convex.cloud

bun run build

cd dist
mkdir -p vstarz
for f in index.html assets logo.svg manifest.webmanifest sw.js icons favicon.ico robots.txt; do
  [ -e "$f" ] && cp -R "$f" vstarz/
done
true
