#!/usr/bin/env bash
# Envía un payload de prueba al webhook de W1, sustituyendo los tokens de tiempo.
#
#   ./tests/enviar_payload.sh 01_mensaje_normal
#   ./tests/enviar_payload.sh 01_mensaje_normal --prod
#
# Por defecto apunta a /webhook-test/ (requiere tener W1 abierto en la UI con
# "Listen for test event"). Con --prod usa /webhook/, que exige W1 activo.
#
# __NOW__ se sustituye por el epoch actual porque el guard de W1 descarta todo lo que
# tenga más de 300 segundos. __OLD__ se sustituye por hace 2 horas, a propósito.
#
# R024 (2026-08-27): el script marca SIEMPRE el payload con "test": true, y W2 corta el
# envío real cuando ve esa marca. Motivo: se simularon mensajes usando números tomados
# de la tabla de contactos y Nai les respondió por WhatsApp de verdad, a personas reales.
# Una prueba no puede escribirle a nadie. Si algún día hace falta probar el envío real,
# se hace explícito con --envio-real, nunca por omisión.
set -euo pipefail

CASO="${1:?uso: $0 <nombre_del_caso> [--prod]}"
MODO="${2:-}"

RUTA="nairobi-os-9f3a7b2c-wa-inbound"
BASE="http://localhost:5678"
if [[ "$MODO" == "--prod" ]]; then
  URL="$BASE/webhook/$RUTA"
else
  URL="$BASE/webhook-test/$RUTA"
fi

ARCHIVO="$(dirname "$0")/payloads/${CASO}.json"
[[ -f "$ARCHIVO" ]] || { echo "No existe $ARCHIVO"; exit 1; }

AHORA="$(date +%s)"
VIEJO="$(( AHORA - 7200 ))"

# El secreto del header lo pide la credencial 'Evolution API webhook entrante'.
: "${EVOLUTION_WEBHOOK_SECRET:?exporta EVOLUTION_WEBHOOK_SECRET con el valor de la credencial}"

CUERPO="$(sed -e "s/\"__NOW__\"/$AHORA/g" -e "s/\"__OLD__\"/$VIEJO/g" "$ARCHIVO")"

# Marca de prueba: W2 la usa para NO enviar el WhatsApp. Se puede desactivar a propósito
# con --envio-real, y en ese caso el script avisa antes de disparar.
ENVIO_REAL="no"
for arg in "$@"; do [[ "$arg" == "--envio-real" ]] && ENVIO_REAL="si"; done
if [[ "$ENVIO_REAL" == "no" ]]; then
  CUERPO="$(python3 -c "
import json,sys
d = json.loads(sys.stdin.read())
d['test'] = True
print(json.dumps(d, ensure_ascii=False))" <<< "$CUERPO")"
else
  DESTINO="$(python3 -c "
import json,sys
d = json.loads(sys.stdin.read())
k = d.get('data', {}).get('key', {})
print(k.get('remoteJidAlt') or k.get('remoteJid') or '?')" <<< "$CUERPO")"
  echo "⚠  --envio-real: Nai le va a ESCRIBIR de verdad a $DESTINO"
  read -rp "   ¿Seguro? (escribe 'si' para continuar): " CONFIRMA
  [[ "$CONFIRMA" == "si" ]] || { echo "Cancelado."; exit 1; }
fi

echo "→ POST $URL"
echo "→ caso: $CASO (timestamp $AHORA, envío real: $ENVIO_REAL)"
curl -sS -X POST "$URL" \
  -H 'content-type: application/json' \
  -H "x-evolution-secret: $EVOLUTION_WEBHOOK_SECRET" \
  -d "$CUERPO" \
  -w '\n← HTTP %{http_code}\n'
