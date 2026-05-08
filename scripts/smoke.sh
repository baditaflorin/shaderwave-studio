#!/usr/bin/env bash
set -euo pipefail

npm run build
npm run pages-preview >/tmp/shaderwave-preview.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4173/shaderwave-studio/ >/dev/null; then
    break
  fi
  sleep 1
done

npm run test:e2e
