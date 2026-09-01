#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  AyeFinance — Root Build & Pipeline Entrypoint
#  Redirige la ejecución a mobile/build.sh manteniendo la misma
#  experiencia y comandos que AyeTasks.
# ─────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -d "$SCRIPT_DIR/mobile" ]]; then
  echo "Error: Directorio mobile/ no encontrado en $SCRIPT_DIR"
  exit 1
fi

cd "$SCRIPT_DIR/mobile"
exec ./build.sh "$@"
