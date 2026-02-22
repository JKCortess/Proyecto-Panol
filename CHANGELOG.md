# Changelog

## v0.4.0 - 2026-02-22

### ✨ Funcionalidades
- Nuevo módulo **Asistente IA** con chat inteligente, historial de conversaciones, y sincronización de inventario
- Agregada API de IA (`/api/ai/chat`, `/api/ai/config`, `/api/ai/conversations`, `/api/ai/sync-inventory`)
- Agregado panel de configuración de IA en administración (`AIConfigPanel`)
- Nuevo ícono y entrada de navegación "Asistente IA" en el sidebar

### 🐛 Correcciones
- Corregidos colores de modo claro en componentes de inventario (`SizeStockSelector`, `InventoryControls`, `InventoryCardActions`, `InventoryActionToolbar`)
- Corregidos estilos de modo claro en panel de administración (`AdminUserTable`, `WebhookConfigPanel`, página admin)
- Corregido color de fondo en badges de cantidad por talla en inventario
- Corregidos estilos del formulario de perfil (`ProfileForm`) y selector de avatar (`AvatarSelector`) para modo claro
- Corregido componente `FilterCombobox` con estilos consistentes claro/oscuro

### 🔧 Mantenimiento
- Ampliados estilos globales CSS (`globals.css`) con nuevas utilidades para modo claro/oscuro
- Refactorizada página de inventario con simplificación de estilos
- Actualizado `progress.md` con registro de actividades recientes
- Agregada imagen de asset "El Maestro" (`el-maestro.png`)

## v0.3.0 - 2026-02-21

### ✨ Funcionalidades
- Agregadas fotografías de productos en el listado de ítems al escanear QR desde el móvil
- Agregado enlace "Ver en inventario" en cada ítem del resultado del escáner QR (abre nueva pestaña)
- Agregado botón "Ver detalle" en cada tarjeta del inventario (deck view) que abre una nueva pestaña filtrada por SKU

### 🔧 Mantenimiento
- Enriquecido el campo `foto` en `lookupRequestByCode()` desde los datos de inventario
- Actualizado tipo `EnrichedItem` en QRScannerClient para incluir campo `foto`
- Agregado archivo `architecture/run_locally.md` con instrucciones de ejecución local

## v0.2.0 - 2026-02-21

### ✨ Funcionalidades
- Mejorado el toggle de tema (ThemeToggle) con diseño más limpio y animaciones suaves
- Mejoras en el escáner QR (QRScannerClient) con mejor manejo de errores y limpieza de recursos

### 🐛 Correcciones
- Corregidos estilos CSS de modo claro para bordes `border-blue-800/30` y `border-amber-800/30`
- Añadidas variantes faltantes de fondo (`bg-slate-900/40`, `bg-slate-900/70`) en tema claro
- Eliminados indicadores de puntos verdes innecesarios en las tarjetas de inventario
- Corregida referencia de router en la página de nueva solicitud

### 🔧 Mantenimiento
- Ampliados estilos globales CSS para mejor cobertura de modo claro/oscuro  
- Actualizado progress.md con registro de cambios recientes
- Refactorizado componente de página principal (Dashboard)

## v0.1.1 - 2026-02-18

### 🐛 Correcciones
- Lectura de credenciales Google desde variable de entorno para compatibilidad con Vercel

## v0.1.0 - 2026-02-18

### ✨ Funcionalidades
- Commit inicial del Proyecto Pañol
- Sistema de gestión de inventario con Supabase
- Interfaz de solicitudes de materiales
- Escáner QR para entregas
- Panel de administración con gestión de permisos
- Autenticación con Google OAuth via Supabase
- Integración con Google Sheets para sincronización de stock
