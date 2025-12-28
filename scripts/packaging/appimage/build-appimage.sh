#!/usr/bin/env bash
set -euo pipefail

# Build AppImage for the Linux target using Taura bundler
# This script assumes you're running on a Linux host with Node and Taura tooling available.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DIST_DIR="$ROOT_DIR/dist/appimage"

mkdir -p "$DIST_DIR"

echo "Installing dependencies (if needed)..."
if [ -f "$ROOT_DIR/package.json" ]; then
  if command -v npm >/dev/null 2>&1; then
    npm ci --no-progress --silent || npm install --silent
  fi
fi

echo "Building AppImage via Taura..."
# Prefer using npx tauri to build for AppImage target
npx tauri build -t x86_64-unknown-linux-musl || { echo "tauri build failed"; exit 1; }

APPIMAGE_DIR="$ROOT_DIR/src-tauri/target/release/bundle/appimage"
APPIMAGE_FILE=$(ls -1 "$APPIMAGE_DIR"/*.AppImage 2>/dev/null | head -n 1 || true)

if [ -z "$APPIMAGE_FILE" ]; then
  echo "AppImage not found in $APPIMAGE_DIR. Ensure tauri bundler produced the AppImage."
  exit 2
fi

cp "$APPIMAGE_FILE" "$DIST_DIR/$(basename "$APPIMAGE_FILE")"
echo "AppImage created: $DIST_DIR/$(basename "$APPIMAGE_FILE")"


