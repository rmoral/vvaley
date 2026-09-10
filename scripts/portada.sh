#!/usr/bin/env bash
# Prepara una portada de pieza para public/covers/piezas/.
#
#   bash scripts/portada.sh ~/Downloads/loquesea.png indexar-salarios-al-ipc-revision-nominas
#
# El segundo argumento es el `nombre_archivo` del front-matter SIN la extensión:
# el importador solo asigna la portada si el nombre coincide exactamente, así
# que copiarlo de ahí evita el "0 puestas, 1 pendientes".
#
# Por qué -strip no es opcional: las imágenes generadas vienen con metadatos de
# procedencia C2PA que en el paquete de agosto eran el 94-97 % del peso del
# fichero. 84 kB de envoltura alrededor de 5 kB de imagen, servidos desde una
# t3.small en cada visita.
set -euo pipefail

ORIGEN=${1:-}
NOMBRE=${2:-}
ANCHO=1376
ALTO=768

if [[ -z "$ORIGEN" || -z "$NOMBRE" ]]; then
  echo "uso: bash scripts/portada.sh <imagen> <nombre-sin-extension>" >&2
  exit 1
fi
[[ -f "$ORIGEN" ]] || { echo "no existe: $ORIGEN" >&2; exit 1; }

# ImageMagick 7 usa `magick`; el 6, `convert`.
if command -v magick >/dev/null 2>&1; then
  IM=(magick)
elif command -v convert >/dev/null 2>&1; then
  IM=(convert)
else
  echo "Falta ImageMagick. macOS: brew install imagemagick · Debian: sudo apt install imagemagick" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
DESTINO="public/covers/piezas/${NOMBRE}.jpg"

"${IM[@]}" "$ORIGEN" \
  -resize "${ANCHO}x${ALTO}^" -gravity center -extent "${ANCHO}x${ALTO}" \
  -strip -quality 82 \
  "$DESTINO"

KB=$(( $(wc -c < "$DESTINO") / 1024 ))
echo "✓ $DESTINO · ${ANCHO}x${ALTO} · ${KB} kB"
# Las otras portadas van de 130 a 190 kB. Muy por debajo suele ser una imagen
# de origen pequeña reescalada hacia arriba; muy por encima, que -strip no
# entró.
if (( KB < 60 )); then
  echo "  ojo: pesa poco para 1376x768. ¿La imagen de origen era más pequeña?" >&2
elif (( KB > 300 )); then
  echo "  ojo: pesa mucho. Revisa que se hayan quitado los metadatos." >&2
fi
