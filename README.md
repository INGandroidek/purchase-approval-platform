# Purchase Approval Platform

Plataforma serverless para la creación y aprobación de solicitudes de compra mediante firma encadenada de 3 aprobadores (OTP + token), construida sobre AWS Lambda, API Gateway y DynamoDB, con un frontend en React.

Repositorio: https://github.com/INGandroidek/purchase-approval-platform

## Índice

1. [Arquitectura](#1-arquitectura)
2. [Stack técnico](#2-stack-técnico)
3. [Estructura del proyecto](#3-estructura-del-proyecto)
4. [Instalación y ejecución local](#4-instalación-y-ejecución-local)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Pruebas y cobertura](#6-pruebas-y-cobertura)
7. [Despliegue (AWS CDK)](#7-despliegue-aws-cdk)
8. [API — documentación](#8-api--documentación)
9. [URLs de prueba (despliegue actual)](#9-urls-de-prueba-despliegue-actual)
10. [Reglas de negocio](#10-reglas-de-negocio)
11. [Supuestos](#11-supuestos)
12. [Pendientes / desviaciones conocidas frente al requerimiento](#12-pendientes--desviaciones-conocidas-frente-al-requerimiento)

---

## 1. Arquitectura

```
Frontend (React SPA)
   │
   ▼
API Gateway (REST)
   │
   ▼
Lambda Handlers ──▶ Casos de uso (Application) ──▶ Entidades (Domain)
   │                                                      │
   ▼                                                      ▼
Repositorios (Infrastructure)  ─────────────────▶  DynamoDB (tabla única, patrón PK/SK + 2 GSI)
```

El backend sigue una arquitectura hexagonal / clean architecture:

- **`domain/`**: entidades (`PurchaseRequest`, `Approver`), enums de estado y servicios de dominio (generación de token/OTP).
- **`application/`**: casos de uso (`CreatePurchaseRequest`, `GetApprovalByToken`, `ValidateApprovalOtp`, `ProcessApprovalDecision`, `SignApproval`) y puertos (interfaces de repositorio).
- **`infrastructure/`**: implementación de los repositorios sobre DynamoDB (AWS SDK v3) y los generadores de token/OTP.
- **`handlers/`**: adaptadores Lambda (API Gateway ⇄ casos de uso).

Seguridad del flujo de aprobación:

- Cada aprobador recibe un **token único** (identificador de la aprobación) y un **OTP de 6 dígitos con expiración de 3 minutos**.
- El OTP debe validarse (`POST /approvals/{token}/otp`) **antes** de poder emitir una decisión (`POST /approvals/{token}/decision`).
- La solicitud de compra requiere **exactamente 3 aprobadores con roles distintos**; se marca `COMPLETED` solo cuando los 3 han firmado, y `REJECTED` en cuanto uno rechaza.

## 2. Stack técnico

### Backend

| Requisito solicitado | Implementado |
|---|---|
| TypeScript / Node.js | ✅ Node.js 24.x (Lambda), TypeScript 5.9, módulos ESM |
| Python 3.8+ / librería PDF | ⚠️ No implementado en el código actual — ver [sección 11](#11-supuestos) |
| Base de datos no relacional | ✅ Amazon DynamoDB (tabla única, `PAY_PER_REQUEST`, 2 GSI) |
| Cobertura de pruebas ≥ 60% | ⚠️ Hay 6 archivos de test (5 unitarios + 1 de integración) pero el umbral no está forzado en `jest.config.js` — ver [sección 12](#12-pendientes--desviaciones-conocidas-frente-al-requerimiento) |

Dependencias clave: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `zod` (validación), `uuid`, `jest` + `ts-jest` (pruebas).

### Frontend

| Requisito solicitado | Implementado |
|---|---|
| React v17+ | ✅ React 19 |
| axios o fetch | ✅ Axios (`frontend/src/api/api.js`) |
| React Router | ✅ `react-router-dom` v7 |
| Micro Front-End con webpack | ⚠️ Webpack 5 se usa como bundler de una SPA única; **no** hay Module Federation / arquitectura multi-remoto — ver [sección 11](#11-supuestos) |
| Cobertura de pruebas ≥ 60% | ⚠️ No implementada (`"test": "echo \"Frontend tests pending\""`) — ver [sección 12](#12-pendientes--desviaciones-conocidas-frente-al-requerimiento) |

### Infraestructura

- **AWS CDK (TypeScript)** en `infrastructure/`: define la tabla DynamoDB, las 4 funciones Lambda (`NodejsFunction`) y el API Gateway REST.

## 3. Estructura del proyecto

```
purchase-approval-platform/
├── backend/
│   ├── src/
│   │   ├── domain/            # Entidades, enums, servicios de dominio
│   │   ├── application/       # Casos de uso, puertos (interfaces), DTOs
│   │   ├── infrastructure/    # Repositorios DynamoDB, generadores de token/OTP
│   │   └── handlers/          # Adaptadores Lambda (API Gateway)
│   ├── tests/                 # Pruebas unitarias e integración (Jest)
│   ├── jest.config.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                # Cliente axios
│   │   ├── components/         # Layout, StatusBadge
│   │   ├── pages/               # Dashboard, CreateRequest, Approval
│   │   └── App.jsx / main.jsx
│   ├── webpack.config.js
│   └── package.json
├── infrastructure/            # AWS CDK (definición de la tabla, Lambdas y API Gateway)
├── docs/
│   ├── architecture.md
│   └── openapi.yaml           # Documentación de la API (Swagger/OpenAPI)
├── test-e2e.ps1                # Script de pruebas end-to-end (PowerShell)
├── pnpm-workspace.yaml          # Monorepo gestionado con pnpm
└── package.json                 # Scripts raíz (build/test para todos los workspaces)
```

## 4. Instalación y ejecución local

Requisitos previos: **Node.js ≥ 20**, **pnpm ≥ 8**, credenciales de AWS configuradas (solo necesarias para desplegar o correr contra DynamoDB real).

```bash
# Clonar el repositorio
git clone https://github.com/INGandroidek/purchase-approval-platform.git
cd purchase-approval-platform

# Instalar dependencias de todos los workspaces (backend, frontend, infrastructure)
pnpm install
```

### Backend

```bash
cd backend
pnpm build          # tsc → dist/
pnpm typecheck       # solo chequeo de tipos
```

El backend se ejecuta como funciones Lambda; no expone un servidor local por defecto. Para probarlo localmente sin desplegar, puede usarse `sam local` / `serverless offline` (no configurado aún en este repo) o desplegar el stack en un entorno de desarrollo con `cdk deploy` (ver sección 7).

### Frontend

```bash
cd frontend
pnpm dev             # levanta webpack-dev-server en http://localhost:3000
pnpm build           # build de producción en frontend/dist
```

La URL base de la API está definida en `frontend/src/api/api.js` (`API_URL`). Si se despliega un nuevo stack, actualizar esa constante con la URL del nuevo API Gateway.

## 5. Variables de entorno

| Variable | Dónde se usa | Descripción |
|---|---|---|
| `PURCHASE_APPROVAL_TABLE_NAME` | Lambdas (backend) | Nombre de la tabla DynamoDB. Se inyecta automáticamente vía CDK al desplegar el stack. |
| `AWS_REGION` | AWS SDK | Región de despliegue (usada `us-east-1` en el ambiente de prueba). |

El frontend no usa variables de entorno de build; la URL de la API está hardcodeada en `frontend/src/api/api.js` (ver [sección 11](#11-supuestos)).

## 6. Pruebas y cobertura

```bash
cd backend
pnpm test             # ejecuta Jest sobre backend/tests/**/*.test.ts
pnpm test:coverage     # ejecuta con reporte de cobertura
```

Archivos de prueba existentes:

- `CreatePurchaseRequest.test.ts`
- `GetApprovalByToken.test.ts`
- `ProcessApprovalDecision.test.ts`
- `SignApproval.test.ts`
- `ValidateApprovalOtp.test.ts`
- `integration/DynamoDBPurchaseRequestRepository.test.ts`

Desde la raíz del monorepo también puede ejecutarse `pnpm test` / `pnpm test:coverage`, que corre el script en todos los workspaces (`pnpm -r test`).

También existe `test-e2e.ps1` en la raíz para pruebas end-to-end contra el API desplegado (PowerShell).

> Ver [sección 12](#12-pendientes--desviaciones-conocidas-frente-al-requerimiento) sobre el umbral de cobertura del 60%.

## 7. Despliegue (AWS CDK)

```bash
cd infrastructure
pnpm install
npx cdk bootstrap     # solo la primera vez por cuenta/región
npx cdk synth          # genera el CloudFormation template
npx cdk deploy         # despliega la tabla DynamoDB, las 4 Lambdas y el API Gateway
```

Al finalizar, CDK expone como *outputs*:

- `PurchaseApprovalTableName`
- `ApproverTokenIndexName`
- `ApproverIdIndexName`
- `PurchaseApprovalApiUrl`

Actualizar `frontend/src/api/api.js` con la nueva `PurchaseApprovalApiUrl` antes de compilar/desplegar el frontend.

## 8. API — documentación

La especificación completa (OpenAPI/Swagger) está en [`docs/openapi.yaml`](./docs/openapi.yaml), con los 4 endpoints, esquemas de request/response, códigos de error e instrucciones de prueba (curl y Postman/Swagger UI).

Resumen de endpoints:

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/purchase-requests` | Crea una solicitud de compra con exactamente 3 aprobadores (roles distintos) |
| `GET` | `/approvals/{token}` | Consulta el detalle de la solicitud y el estado del aprobador dueño del token |
| `POST` | `/approvals/{token}/otp` | Valida el OTP del aprobador (requisito previo a la decisión) |
| `POST` | `/approvals/{token}/decision` | Registra la decisión (`APPROVED` / `REJECTED`) del aprobador |

Para visualizar la especificación de forma interactiva: pegar el contenido de `docs/openapi.yaml` en [editor.swagger.io](https://editor.swagger.io) o abrirlo con la extensión "Swagger Viewer" de VS Code.

## 9. URLs de prueba (despliegue actual)

- **API Gateway (base):** `https://jguzyqqsw9.execute-api.us-east-1.amazonaws.com/prod`
- **Endpoint principal:** `https://jguzyqqsw9.execute-api.us-east-1.amazonaws.com/prod/purchase-requests`

> Nota: no fue posible verificar en este documento la disponibilidad en vivo de estas URLs (el entorno donde se generó esta documentación no tiene salida de red hacia dominios de AWS). Verificar manualmente con el ejemplo `curl` de `docs/openapi.yaml` antes de la entrega final.

Frontend: agregar aquí la URL una vez desplegado (por ejemplo, en S3 + CloudFront, Amplify Hosting o Vercel/Netlify), y actualizar `frontend/src/api/api.js` para que apunte al API Gateway anterior.

## 10. Reglas de negocio

- Una solicitud de compra debe tener **exactamente 3 aprobadores**, y sus **roles deben ser distintos** entre sí (`CreatePurchaseRequest`).
- El **OTP expira a los 3 minutos** de generado (`otpExpiresAt`).
- Un aprobador **no puede emitir una decisión** sin haber validado antes su OTP, y la validación debe haber ocurrido dentro de la ventana de expiración (`ProcessApprovalDecision`).
- Cada aprobador puede emitir **una única decisión** (`PENDING → SIGNED` o `PENDING → REJECTED`); intentos posteriores son rechazados.
- La solicitud pasa a `COMPLETED` solo cuando **los 3 aprobadores** están en estado `SIGNED`; pasa a `REJECTED` apenas **uno** rechaza.
- Una vez que la solicitud tiene estado distinto de `PENDING`, no admite nuevas decisiones (`Purchase request has already been decided`).

## 11. Supuestos

1. **Generación de PDF y componente en Python**: el requerimiento original pide una librería de generación de PDF y Python 3.8+ en el backend. En el código actual (`docs/architecture.md`) se contempla un flujo *"Approval signed → Check 3 approvals → EventBridge → PDF Lambda → S3"*, pero **esa Lambda de generación de PDF no está implementada** en el repositorio al momento de este documento. Se asume que es un entregable pendiente, no que el requisito fue descartado.
2. **"Micro Front-End con webpack"**: se interpretó como *frontend empaquetado con webpack*, no como una arquitectura de micro-frontends real (Module Federation, single-spa, etc.). El proyecto actual es una **SPA única** con `react-router-dom` para las rutas (`Dashboard`, `CreateRequest`, `Approval`).
3. **URL de la API en el frontend**: se asume ambiente único (no hay `.env` por ambiente); la URL del API Gateway está hardcodeada en `frontend/src/api/api.js`. Para múltiples ambientes (dev/staging/prod) se recomienda migrar a variables de entorno de build (`process.env` + webpack `DefinePlugin`).
4. **Autenticación**: no hay autenticación de usuarios (login) para crear solicitudes; el control de acceso de los aprobadores se basa exclusivamente en el conocimiento del **token único** enviado (presumiblemente por correo, aunque el envío de notificaciones no está implementado en el código revisado).
5. **Notificaciones a aprobadores**: se asume que el envío de token/OTP por correo a cada aprobador es un paso externo/manual o pendiente de implementar (no se encontró integración con SES u otro proveedor de correo en el código).

## 12. Pendientes / desviaciones conocidas frente al requerimiento

- [ ] Implementar el módulo de **generación de PDF** (Python o librería Node.js) y su despliegue (Lambda + S3) al completarse una solicitud.
- [ ] Configurar `coverageThreshold` en `backend/jest.config.js` para **forzar** el mínimo de 60% de cobertura en CI, y agregar pruebas al frontend (actualmente sin suite de tests).
- [ ] Evaluar si se requiere una arquitectura real de micro-frontends (Module Federation) o si el alcance de "con webpack" ya se satisface con el bundler actual.
- [ ] Automatizar el envío de credenciales (token + OTP) a los aprobadores por correo electrónico.
- [ ] Agregar pipeline CI/CD (GitHub Actions) que corra `pnpm test:coverage` y bloquee el merge por debajo del umbral.

---

## Créditos

Proyecto: **Purchase Approval Platform** — plataforma de aprobación de compras con firma encadenada de 3 aprobadores.
