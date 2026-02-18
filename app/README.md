# Gestión de Pañol | App Web

Aplicación interna para gestión de inventario, solicitudes de materiales y control administrativo con trazabilidad completa.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (Auth + DB)
- n8n (webhook de automatización)
- Resend (fallback de envío)
- Google Sheets API (fuente auxiliar para catálogo/búsqueda)

## Requisitos

- Node.js 20+
- npm 10+
- Proyecto Supabase con tablas base creadas
- Archivo `token.json` (si usarás integración con Google Sheets)

## Instalación

```bash
npm install
```

## Configuración (`.env.local`)

Variables usadas por la app:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
PANOL_DB_SPREADSHEET_ID=
RESEND_API_KEY=
RESEND_TO_OVERRIDE=
N8N_WEBHOOK_URL=
```

Notas:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son obligatorias para autenticación y datos.
- `PANOL_DB_SPREADSHEET_ID` y `token.json` se usan para la búsqueda/lectura de inventario desde Google Sheets (`src/lib/data.ts`).
- `RESEND_*` se usa como fallback cuando n8n no confirma recepción.
- `N8N_WEBHOOK_URL` existe en entorno, pero actualmente la URL activa está definida en `src/app/requests/actions.ts`.

## Ejecutar en local

```bash
npm run dev -- --port 3000
```

Abrir: `http://localhost:3000`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Módulos principales

- `src/app/page.tsx`: dashboard con KPIs, tendencias y vista administrativa.
- `src/app/requests/new`: creación de solicitud y envío al webhook n8n.
- `src/app/requests/pending`: gestión administrativa de pendientes, acciones masivas y trazabilidad.
- `src/app/my-orders`: historial de solicitudes del usuario.
- `src/app/stock`: entradas/salidas de stock y movimientos.
- `src/app/inventory`: catálogo de inventario.
- `src/app/admin`: permisos por rol y administración de usuarios.
- `src/app/profile`: perfil y permisos del usuario autenticado.

## Flujo de solicitudes

1. Usuario crea solicitud en `/requests/new`.
2. Se registra en `material_requests`.
3. Se envía payload al webhook n8n.
4. Si falla n8n y hay `RESEND_API_KEY`, se intenta envío por Resend.
5. Administrador procesa en `/requests/pending`:
   - cambios de estado (`Pendiente`, `Aceptada`, `Alerta`, `Cancelada`)
   - entrega individual/masiva
   - eliminación individual/masiva
6. Cada movimiento administrativo se registra en `request_status_log` (quién, cuándo, acción y motivo).

## Roles y permisos

- Rol `Administrador`: acceso completo.
- Rol `Operador` (u otros): acceso por `role_permissions`.
- Control de acceso en middleware: `src/utils/supabase/middleware.ts`.

## Tablas usadas (Supabase)

- `user_profiles`
- `role_permissions`
- `material_requests`
- `request_status_log`
- `inventory`
- `stock_movements`

## Documentación interna

- [Guía Editorial de Microcopy](docs/microcopy-style-guide.md)

## Calidad

- Lint: `npm run lint`
- Estado esperado antes de merge: sin warnings ni errores.
