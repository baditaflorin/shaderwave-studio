#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PORT:-}" ]]; then
  PORT="$(node -e "const net=require('node:net'); const s=net.createServer(); s.listen(0,'127.0.0.1',()=>{console.log(s.address().port); s.close();});")"
fi
BASE_URL="http://127.0.0.1:${PORT}/shaderwave-studio/"

npm run build
npx vite preview --host 127.0.0.1 --port "$PORT" --strictPort >/tmp/shaderwave-preview.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -fsS "$BASE_URL" >/dev/null; then
    break
  fi
  sleep 1
done

PLAYWRIGHT_BASE_URL="$BASE_URL" npm run test:e2e
