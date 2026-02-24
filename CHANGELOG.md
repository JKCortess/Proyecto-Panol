# Changelog

## v0.5.6 - 2026-02-23

### ✨ Funcionalidades
- **Edición requiere talla**: El botón "Editar Ítem" ahora se deshabilita en ítems con múltiples tallas hasta que se seleccione una talla específica — previene ediciones accidentales en la vista "Todas"
- **Campos de valor separados**: El modal de edición ahora muestra dos campos independientes: "Valor aprox (CLP)" (columna Q) y "Valor confirmado SPEX" (columna R) — la columna "Valor" (S) se calcula automáticamente en el Google Sheet

### 🐛 Correcciones
- **Fix crítico mapeo de columnas**: Corregido desfase en 12 columnas de Google Sheets (N→X) — Observación, Descripción General, ROP, Safety Stock, Clasificación y Proveedor se leían/escribían en columnas incorrectas
- El código asumía una columna `#` fantasma en N (index 13) que no existía, desplazando todo lo posterior

### 🔧 Mantenimiento
- Verificado mapeo de columnas contra Google Sheet real via navegador
- Actualizados comentarios de documentación en `data.ts` y `actions.ts`

## v0.5.5 - 2026-02-23

### ✨ Funcionalidades
- **Edición de ítems de inventario (Admin)**: Modal de edición con campo para nombre, stock, precio, ubicación, clasificación y descripción — sincroniza en tiempo real con Google Sheets
- **Confirmación visual de cambios**: Diálogo de confirmación que muestra resumen de campos modificados (valor anterior → valor nuevo) antes de guardar
- **Historial de auditoría**: Tabla `inventory_edit_history` en Supabase registra automáticamente cada cambio con valor anterior, valor nuevo, editor y timestamp
- **Página de historial de ediciones** (`/admin/edit-history`): Vista admin con registros agrupados, búsqueda por SKU/nombre/editor, y paginación
- **Navegación**: Nuevo enlace "Historial Ediciones" en la sección de Administración del sidebar

### 🐛 Correcciones
- **Fix overlap iconos/valores**: Eliminados iconos superpuestos dentro de los inputs del modal de edición — los valores ahora se leen correctamente
- **Fix sidebar doble highlight**: Corregido `/admin` y `/admin/edit-history` resaltados simultáneamente — `/admin` ahora requiere coincidencia exacta

### 🔧 Mantenimiento
- Actualizado `progress.md` con registro completo de cambios

## v0.5.4 - 2026-02-23

### 🐛 Correcciones
- **Asistente IA no encontraba productos**: Corregido bug crítico donde el Maestro no encontraba ítems como "guantes de PU" — el asistente consultaba una tabla Supabase `inventory` desincronizada en vez de Google Sheets (la fuente real de datos)
- Las 5 funciones de herramientas del IA (`buscar_inventario`, `contar_stock`, `detalle_item`, `listar_categorias`, `items_stock_bajo`) ahora usan `getInventory()` directamente desde Google Sheets, igual que la página de Inventario
- Eliminada dependencia de sincronización manual — el asistente siempre ve los datos actualizados en tiempo real

## v0.5.3 - 2026-02-23

### 🐛 Correcciones
- **Imágenes del asistente IA**: Corregido bug donde las imágenes de productos no se mostraban en el chat del Maestro en Vercel — el middleware de autenticación interceptaba `/api/image-proxy` con 401/307
- Mejorados estilos del dashboard para modo claro (gradientes, fondos, colores de texto)
- Mejorado estilo visual de filtros seleccionados en inventario (modo claro/oscuro)
- Filtrado de conversaciones fantasma: solo se registran conversaciones con mensajes reales

## v0.5.2 - 2026-02-23

### ✨ Funcionalidades
- **Selector de cámara en escáner QR**: Dropdown para elegir entre cámaras disponibles del dispositivo, evitando que se active la ultra-wide (0.6x) por defecto
- Persistencia de cámara preferida en `localStorage` para futuras visitas
- Reinicio automático del escáner al cambiar de cámara
- **Carrito flotante movible**: El ícono del carrito ahora se puede arrastrar a cualquier posición de la pantalla

## v0.5.1 - 2026-02-23

### 🐛 Correcciones
- Corregido desfase de clave de permisos: `orders` → `my_orders` sincronizado entre DB, middleware y navegación
- Corregido middleware de rutas: ahora protege las 9 rutas (antes solo 4), evitando acceso directo por URL a páginas restringidas
- Corregido redirect loop: usuarios con dashboard bloqueado son redirigidos a `/inventory` en vez de `/` 
- Corregido match de ruta raíz `/` en middleware (antes matcheaba todas las rutas)

### ✨ Funcionalidades
- Agregadas entradas de permisos para "Escanear QR" y "Administrar Solicitudes" en panel admin (ahora 9/9 páginas controlables)

### 🔧 Mantenimiento
- Eliminado legacy mapping `orders` en `AdminPermissionsPanel.tsx`
- Actualizado `progress.md` con registro de cambios

## v0.5.0 - 2026-02-23

### ✨ Funcionalidades
- **QR en Supabase Storage**: Las imágenes QR de solicitudes ahora se almacenan como PNG públicos en un bucket `qr-codes` de Supabase Storage, con limpieza automática al entregar
- **Webhook enriquecido**: El payload JSON al webhook de n8n ahora incluye `recipient_phone`, `qr_image_url` y `request_code` como campos independientes
- **Asistente IA — Adjuntar archivos**: Soporte para enviar imágenes y PDFs al chat con Gemini (multimodal), con previsualización visual, lightbox, y pegado desde portapapeles (Ctrl+V)
- **Asistente IA — Sidebar colapsable**: Panel lateral de historial estilo Gemini con toggle de visibilidad
- **Asistente IA — Eliminar todos los chats**: Botón con modal de confirmación para soft-delete masivo de conversaciones
- **Asistente IA — Gestión de API Keys**: Panel para rotar y gestionar múltiples API Keys de Gemini con verificación de disponibilidad por modelo
- **Filtros de inventario ampliados**: Nuevos filtros por Tipo Componente, Modelo, Potencia y Proveedor
- **Badge de categoría**: Etiqueta de categoría visible en cada tarjeta del inventario (deck view)
- **Supabase Realtime**: Replicación habilitada para `material_requests`, `request_status_log` y `stock_movements`

### 🐛 Correcciones
- Corregidos slugs de modelos Gemini 3 Flash y 3 Pro (`gemini-3-flash-preview`, `gemini-3-pro-preview`)
- Corregido flash del nombre del bot al cargar la página del asistente (fetch server-side)
- Corregida sincronización Supabase: deduplicación por SKU (114 filas → 83 SKUs únicos)
- Eliminados paneles con tinte azul en modo oscuro → paleta neutral gris
- Corregidos colores de texto del chat en modo claro
- Corregida visibilidad del avatar de usuario en mensajes del chat

### 🔧 Mantenimiento
- Actualizado mapeo de columnas de Google Sheets (3 nuevas columnas: Tipo Componente, Modelo, Potencia)
- Mejorado system prompt del asistente IA con conocimiento técnico EPP y tono formal
- Actualizado `progress.md` con registro completo de cambios
- Actualizado `gemini.md` con schema de datos actualizado

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
