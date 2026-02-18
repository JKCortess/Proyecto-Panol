# Findings — Proyecto Pañol

## Descubrimientos

### Decisiones del Usuario (Historial)
- **Backend original**: Google Sheets (no AppSheet Database)
- **Backend actual**: Supabase (auth, perfiles, solicitudes) + Google Sheets (inventario legacy)
- **Cuenta Google**: Personal (no Workspace) — `panoldolemolina@gmail.com`
- **Notificaciones**: Resend email + N8N webhooks
- **Datos existentes**: 166 ítems importados de Excel a Google Sheets
- **EPP**: Diferido a fase posterior
- **Diseños UI**: 6 pantallas en Stitch (proyecto ID: 7996770356914865392)

### Stack Tecnológico Confirmado (Feb 2026)

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI Library | React | 19.2.3 |
| Base de Datos | Supabase SSR + Google Sheets | 0.8.0 / 2.95.3 |
| CSS | TailwindCSS 4 + PostCSS | ^4 |
| Animaciones | Framer Motion | 12.34.0 |
| Iconos | Lucide React | 0.564.0 |
| Forms | React Hook Form + Zod | 7.71.1 / 4.3.6 |
| Email | Resend + Nodemailer | 6.9.2 / 8.0.1 |
| Automatización | N8N Webhooks | — |
| APIs externas | Google APIs (Sheets/Drive) | 171.4.0 |
| Python (tools) | Scripts de migración | 3.13.7 |

### Módulos de la App (8 rutas activas)

| Módulo | Ruta | Componentes clave |
|---|---|---|
| Dashboard | `/` | `page.tsx` (33KB), DashboardRealtimeSync, NotificationBell |
| Inventario | `/inventory` | InventoryControls, FilterCombobox, FilterVisibilityManager |
| Gestión Stock | `/stock` | StockManager (entrada/salida) |
| Solicitudes | `/requests` | PendingRequestsList (74KB), CreateRequestForm, CancelRequestButton |
| Mis Pedidos | `/my-orders` | Lista con detalle, precios, re-ordenar |
| Perfil | `/profile` | AvatarSelector, Server Actions |
| Admin | `/admin` | AdminMovementHistoryTable |
| Auth/Login | `/login` | Supabase Auth |

### Integraciones Activas
- **Supabase**: Auth (email/password), user_profiles, material_requests, RLS, Realtime (con fallback polling)
- **Google Sheets**: Spreadsheet `Pañol_DB` (ITEMS, MOVIMIENTOS, PEDIDOS, etc.)
- **Resend**: Envío de emails transaccionales
- **N8N**: Webhook endpoint para automatización

### Infraestructura Verificada
- Python 3.13.7 instalado
- google-api-python-client v2.190.0
- OAuth token activo con scopes: `spreadsheets` + `drive`
- Token guardado en: `token.json`
- Node.js con npm — `node_modules` presentes en `app/`

### Restricciones Identificadas
- Cuenta personal → no se puede hacer deploy a grupo de Workspace
- Google Charts API para QR es legacy, considerar alternativas (qrserver API)
- Límite Google Sheets: ~10M celdas, 5000 filas recomendado máximo para rendimiento
- Supabase Realtime requiere replicación habilitada en la tabla `material_requests`
- Componente `PendingRequestsList.tsx` es muy grande (74KB) — candidato a refactorización

### Compatibilidad Móvil (Feb 2026)
- **Breakpoint clave**: `md` (768px) define la transición desktop ↔ móvil
- **Sidebar**: `hidden md:flex` — desktop: flex lateral | móvil: oculto
- **MobileNav**: `md:hidden` — móvil: bottom bar con 5 tabs + drawer | desktop: oculto
- **Navegación móvil**: Bottom tab bar (Inicio, Inventario, Carrito, Solicitudes, Más)
- **Safe Area**: `env(safe-area-inset-bottom)` para iPhone home bar
- **Touch targets**: Mínimo 44x44px recomendado (Apple HIG / Material Design)
- **Dispositivos target Chile**: Samsung S25 (412x915), iPhone 15 (390x844), Xiaomi Redmi Note (393x851), Samsung A54 (412x915), Motorola G (360x800)
- **Tablas en móvil**: CSS `mobile-card-table` transforma `<table>` en tarjetas apiladas verticalmente
- **Lightbox touch**: Swipe para navegar, pinch-to-zoom, drag para pan
- **Carrusel**: Botones prev/next siempre visibles en touch devices

### Skills Instaladas (Feb 2026)
1. `experto-nextjs-supabase` — Next.js 16 + Supabase SSR completo
2. `experto-tailwindcss-ui` — TailwindCSS 4 + Framer Motion + sistema de temas
3. `gestion-panol-etapa` — Dominio del negocio Pañol + protocolo E.T.A.P.A.
4. `experto-powerbi-dax` — Power BI + DAX (pre-existente)
5. `creador-de-habilidades` — Meta-skill para crear nuevas skills (pre-existente)
