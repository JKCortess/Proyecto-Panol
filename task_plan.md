# Task Plan — Proyecto Pañol (Gestión de Pañol — Dole Molina)

## Fase 0: Inicialización E.T.A.P.A. ✅
- [x] Crear gemini.md (Constitución)
- [x] Crear task_plan.md
- [x] Crear findings.md
- [x] Crear progress.md

## Fase 1: Higiene de Datos y Setup (Semanas 1-2)
- [x] Crear Google Sheet `Pañol_DB` con 7 hojas
- [x] Configurar encabezados y formato de columnas
- [x] Insertar datos de configuración inicial (7 parámetros)
- [x] Insertar usuarios de prueba (5 usuarios con roles)
- [x] Verificar estructura creada (verificar_panol_db.py ✅)
- [x] Cargar datos reales de inventario (166 ítems importados de Excel)
- [x] Configurar usuario Técnico (daniel.rojas@dole.com)

## Fase 2: Web App Premium (Next.js) — (Semanas 3-5)
- [x] **Ejecución Local**: Iniciar servidor de desarrollo en localhost:3000
- [ ] **Diseño System**: Definir tema "Industrial Dark" (Colores, Tipografía, Componentes)
- [x] **Conexión DB**: Configurar API Routes y funciones de data (lib/data.ts)
    - [x] `getInventory`
    - [x] `getOrders`
    - [x] `getUsers`
- [x] **Módulos Core**:
    - [x] Inventario: Buscador y Filtros funcionales (Server Side Filtering)
    - [x] Escáner QR: Página de simulación de escaneo (Input manual de Token)
    - [x] Pedidos: Vista de lista de pedidos activos
    - [x] Administración: Vista de usuarios y configuración básica
- [ ] **Autenticación**: Login simple (o Firebase Auth si se requiere)

## Fase 3: Automatización & Despliegue (Semanas 6-8)
- [ ] **Integración**: Conectar acciones de la Web App con los scripts de Apps Script
- [ ] **Notificaciones**: Emails transaccionales
- [ ] **Despliegue**: Publicar app (Vercel o Netlify)
- [ ] EPP (diferido)

## Fase 4: Optimización (Semanas 9-10)
- [ ] Dashboard Looker Studio
- [ ] Ajuste SS/ROP con datos reales
- [ ] Evaluación integración ERP
