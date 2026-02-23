# Task Plan — Proyecto Pañol (Gestión de Pañol — Dole Molina)

## Fase 0: Inicialización E.T.A.P.A. ✅
- [x] Crear gemini.md (Constitución)
- [x] Crear task_plan.md
- [x] Crear findings.md
- [x] Crear progress.md

## Fase 1: Higiene de Datos y Setup ✅
- [x] Crear Google Sheet `Pañol_DB` con 7 hojas
- [x] Configurar encabezados y formato de columnas
- [x] Insertar datos de configuración inicial (7 parámetros)
- [x] Insertar usuarios de prueba (5 usuarios con roles)
- [x] Verificar estructura creada (verificar_panol_db.py ✅)
- [x] Cargar datos reales de inventario (166 ítems importados de Excel)
- [x] Configurar usuario Técnico (daniel.rojas@dole.com)

## Fase 2: Web App Premium (Next.js) ✅
- [x] **Ejecución Local**: Iniciar servidor de desarrollo en localhost:3000
- [x] **Design System**: Tema "Industrial Dark" + Light mode completo (CSS variables, Tailwind dark: variants)
- [x] **Conexión DB**: Configurar API Routes y funciones de data (lib/data.ts)
    - [x] `getInventory` (Google Sheets → caché in-memory 60s)
    - [x] `getOrders` (Supabase)
    - [x] `getUsers` (Supabase)
- [x] **Módulos Core**:
    - [x] Inventario: Buscador, filtros multi-selección, deck/list view, carrusel de imágenes, lightbox, agrupación por talla
    - [x] Escáner QR: Cámara + ingreso manual, detalle enriquecido, entrega rápida
    - [x] Solicitudes: Carrito, envío con email+QR, seguimiento, cancelación, re-orden
    - [x] Administración: Gestionar solicitudes, entregar, anular, historial de movimientos
    - [x] Gestión de Stock: Entrada/Salida directa en Google Sheets
    - [x] Asistente IA "El Maestro": Chat streaming, herramientas SQL, conocimiento técnico EPP, gestión de API keys
    - [x] Dashboard: KPIs, gráficos de tendencia, realtime sync
    - [x] Notificaciones: Campana admin, toasts Sonner, realtime/polling
- [x] **Autenticación**: Google OAuth (Supabase Auth) + RLS + roles
- [x] **Mobile**: Bottom nav, touch gestures, responsive completo
- [x] **Supabase Realtime**: Replicación habilitada para material_requests, request_status_log, stock_movements
- [x] **Pulido UI**: Toaster con CSS variables, NotificationBell light mode, DashboardRealtimeSync

## Fase 3: Despliegue ✅
- [x] **Despliegue Vercel**: App publicada y funcional
- [x] **Emails transaccionales**: Email de confirmación con QR (template premium HTML)
- [x] **Webhook N8N**: Toggle test/producción desde panel admin
- [~] **Integración Apps Script**: No aplica — conexión directa a Google Sheets API es suficiente

## Fase 4: Optimización (Futuro)
- [ ] Dashboard Looker Studio (analítica avanzada)
- [ ] Ajuste SS/ROP con datos reales de consumo
- [ ] Evaluación integración ERP
