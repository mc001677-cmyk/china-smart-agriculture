#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[preflight] Node: $(node -v)"
echo "[preflight] pnpm: $(pnpm -v)"

echo "[preflight] install (frozen lockfile)"
pnpm install --frozen-lockfile

echo "[preflight] typecheck"
pnpm check

echo "[preflight] tests"
pnpm test

echo "[preflight] build"
pnpm build

echo "[preflight] OK"

