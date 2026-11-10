# Rol de Claude en este repo

Filosofía Aye (confirmada 2026-09-18): Claude piensa con los grafos y escribe specs, agy (Gemini en Antigravity) implementa, Claude audita el diff. Claude no escribe código de la app salvo esqueleto/cableado o cuando el usuario lo pide.

## Prompts para agy

Un bloque = un spec en `docs/agy/AAAA-MM-DD/<id>-<nombre-corto>.md` (carpeta por día; reglas compartidas en `docs/agy/_<nombre>.md`). Todo lo que agy debe hacer va entre `### PROMPT PARA GEMINI — copiar desde aquí` y `### FIN DEL PROMPT PARA GEMINI`, en palabras, sin bloques de código. En el chat solo va el mini prompt que apunta al archivo. Formato completo, commits y auditoría: sección "How specs and prompts are delivered" de `~/.claude/rules/gemini-workflow.md`.

Letras de bloque (el número sigue creciendo por letra):

| Letra | Capa | Siguiente |
|---|---|---|
| B | Backend FastAPI (`backend/`) | B1 |
| M | App Expo / React Native (`mobile/src`, `mobile/App.tsx`; incluye la web exportada con `build:web`) | M1 |
| I | iOS nativo: widgets Swift (`mobile/targets/widgets`, `mobile/plugins/withAppleWidgets.js`, `mobile/widget-sandbox`) | I1 |
| A | Android nativo: widgets (`mobile/targets/android-widgets`, `mobile/plugins/withAndroidWidgets.js`) | A1 |

## Anatomía y qué no tocar

- Backend por capas: `app/api/v1/endpoints/<recurso>.py` (HTTP) → `app/services/<recurso>_service.py` (lógica y queries) → `app/models/`; schemas en `app/schemas/`; routers montados en `app/api/v1/router.py`. Cada query filtra por el `user_id` del JWT de aye-auth. La autenticación vive en aye-auth, no aquí.
- `mobile/ios/` y `mobile/android/` son generados por Expo CNG (ignorados en git): los cambios nativos van por `mobile/plugins/` y `mobile/targets/`.
- Diseño y producto: `DESIGN.md`, `PRODUCT.md`.

## Verificación al auditar

- `git status --short` + `git diff` + archivos no rastreados; alcance contra el spec.
- Grafos: `~/.claude/tools/graphify-bridge/refresh.sh ~/tech/code/aye/aye-finance aye-finance` e `index_repository`; revisar los huecos del puente cliente↔API (`/auth/*` va a aye-auth: enlazar con `link-services.sh`) y `graphify affected` sobre lo tocado.
- Backend, desde `backend/`: `./venv/bin/ruff check . --exclude venv` y `./venv/bin/python -m pytest app/tests -q`.
- Móvil, desde `mobile/`: `npx tsc --noEmit` y `npm run build:web`.
- Widgets iOS: los compila Claude (Debug y Release); agy no corre `xcodebuild`. Swift casi no entra en los grafos: auditar con diff + Read.
