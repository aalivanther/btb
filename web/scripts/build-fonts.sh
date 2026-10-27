#!/usr/bin/env bash
# Regenera app/fonts/*.woff2 a partir de los TTF fuente, sin pérdida (mismos glifos, métricas y hinting).
# Shantell Sans fija sus ejes INFM, BNCE y SPAC en su valor por defecto (0, el que el CSS ya usa) y conserva wght;
# --no-optimize deja intactos los deltas de wght (sin él, IUP mueve algunos puntos hasta 0.5 unidades).
# Requiere: python3 -m pip install fonttools==4.67.0 brotli==1.2.1
# Uso: web/scripts/build-fonts.sh   (o FONTTOOLS="python3 -m fontTools" si fonttools no está en el PATH)
set -euo pipefail
cd "$(dirname "$0")/../app/fonts"
FONTTOOLS=${FONTTOOLS:-fonttools}
# Marca de tiempo fija en la tabla head para que la salida sea reproducible byte a byte.
export SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-1760227200}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

for name in bangers bungee spacegrotesk geistmono; do
  $FONTTOOLS ttLib.woff2 compress -o "$name.woff2" "$name.ttf"
done

$FONTTOOLS varLib.instancer -q --no-optimize -o "$tmp/shantellsans.ttf" shantellsans.ttf INFM=0 BNCE=0 SPAC=0
$FONTTOOLS ttLib.woff2 compress -o shantellsans.woff2 "$tmp/shantellsans.ttf"
