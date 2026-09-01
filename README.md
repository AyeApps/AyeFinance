# 💸 AyeFinance — Personal Finance & Cash Flow Ledger

![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)
![Next.js 16](https://img.shields.io/badge/Next.js-16_Atelier-black?style=flat-square&logo=next.js&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=flat-square&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-CNG_57-000020?style=flat-square&logo=expo&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Beanie_ODM-47A248?style=flat-square&logo=mongodb&logoColor=white)

**AyeFinance** es la aplicación integral de gestión y proyección de finanzas personales del ecosistema **AyeApps**. Permite controlar múltiples cuentas bancarias (corrientes, ahorros, inversiones), registrar transferencias, ingresos y gastos en tiempo real, y automatizar proyecciones de flujo de efectivo a 30 días basadas en gastos fijos y suscripciones recurrentes.

---

## 🏗️ Arquitectura del Monorepo

```
AyeFinance/
├── backend/            # FastAPI 0.115 + Python 3.12 + Beanie ODM + MongoDB
│   ├── app/
│   │   ├── api/v1/     # Endpoints REST (auth, accounts, transactions, recurring)
│   │   ├── core/       # Security, JWT, config, logging, rate limiting
│   │   ├── db/         # Beanie initialization
│   │   ├── models/     # Document models (SoftDeleteDocument, isolation por user_id)
│   │   ├── schemas/    # Pydantic v2 schemas con validaciones
│   │   ├── services/   # Business logic (proyección 30d, reversiones de saldo)
│   │   └── tests/      # Suite de integración con pytest y mongomock
├── web/                # Next.js 16 (App Router) + React 19 + Tailwind CSS v4 Atelier
│   ├── src/
│   │   ├── app/        # Pages ((auth)/login, (dashboard)/*)
│   │   ├── components/ # Atelier UI (Cards, Badges, Modals, Forms)
│   │   └── lib/        # API client y auth helpers
├── mobile/             # React Native 0.86 + Expo CNG 57 (Single Codebase iOS + Android)
│   ├── build.sh        # Pipeline interactivo de compilación y Metro Bundler
│   ├── app.json        # Configuración de bundle (com.ayeapps.ayefinance)
│   └── src/            # AuthScreen (Google, Apple, Email), Dashboard, Accounts, Tx
└── .github/workflows/  # CI/CD pipelines
```

---

## 🚀 Inicio Rápido (< 3 minutos)

### 1. Backend API (FastAPI)

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8003
```
- API Docs: `http://localhost:8003/docs`
- Health Check: `http://localhost:8003/health`

### 2. Frontend Web (Next.js 16 Atelier)

```bash
cd web
npm install
npm run dev
```
- Web App: `http://localhost:3002`

### 3. App Móvil Unificada (iOS + Android con Expo CNG)

```bash
cd mobile
./build.sh start      # Iniciar Metro Bundler
./build.sh run-ios    # Compilar y correr en Simulador iOS
./build.sh run-android# Compilar y correr en Android
```


### 3. Pruebas Automatizadas

```bash
cd backend
source venv/bin/activate
pytest app/tests
```

---

## 🔒 Seguridad e Integración con `aye-auth`

- Autenticación centralizada por JWT Bearer Token.
- Verificación estricta de permisos (`apps_access.finance == true`).
- Auto-aprovisionamiento transparente en MongoDB (`aye_finance_dev`).
- Aislamiento horizontal estricto: todas las consultas filtran obligatoriamente por `user_id == current_user.id`.
- Modelos con soporte de Soft Delete (`SoftDeleteDocument`).
