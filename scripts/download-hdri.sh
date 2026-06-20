#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/hdri"
mkdir -p "$DEST"

echo "Downloading HDR environment maps to public/hdri/ ..."

if [[ -f "$DEST/lebombo_1k.hdr" && -f "$DEST/st_fagans_interior_1k.hdr" ]]; then
  echo "HDR files already present, skipping."
  ls -lh "$DEST"
  exit 0
fi

curl -fsSL -o "$DEST/lebombo_1k.hdr" \
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/lebombo_1k.hdr"

curl -fsSL -o "$DEST/st_fagans_interior_1k.hdr" \
  "https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/st_fagans_interior_1k.hdr"

echo "Done."
ls -lh "$DEST"
