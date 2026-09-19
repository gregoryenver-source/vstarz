#!/usr/bin/env bash
# Vercel production build for the /vstarz subpath mount.
# Exports the subpath base + public Convex URL, builds, then mirrors the
# output under dist/vstarz/ so every /vstarz/... path exists on disk.
set -euo pipefail

export VITE_APP_BASE=/vstarz/
# Backend deployment (owned by the project owner):
#   https://posh-ostrich-667.convex.cloud  — created 2026-09-19 after the
#   original platform-provisioned deployment (combative-kookabura-535) proved
#   inaccessible from the owner's Convex account.
export VITE_CONVEX_URL=https://posh-ostrich-667.convex.cloud

bun run build

cd dist
mkdir -p vstarz
for f in index.html assets vstarz-mark.webp ignition-logo-possibility.png favicon-64.png manifest.webmanifest sw.js icons favicon.ico robots.txt meta-logo.svg facebook-logo.svg instagram-logo.svg; do
  [ -e "$f" ] && cp -R "$f" vstarz/
done
true
