#!/usr/bin/env bash
set -euo pipefail
pkill -f 'next dev' 2>/dev/null || true
rm -rf .next node_modules/.cache
exec next dev -H 127.0.0.1 -p 3000
