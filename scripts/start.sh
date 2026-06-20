#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load nvm node if available
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi

echo "Stopping old servers on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "Clearing Next.js cache..."
rm -rf .next node_modules/.cache .turbo

echo "Starting MAJ Boutique..."
exec npm run dev -- -H 127.0.0.1 -p 3000
