# Progress Log — Proyecto Pañol (Gestión de Pañol — Dole Molina)

## Estado Actual
- **Fase**: 2 (Web App Premium) — ✅ COMPLETADA
- **Progreso**: ~97%
- **Última Actualización**: QR Storage en Supabase + Webhook con teléfono, código y URL del QR.

## Log de Cambios (Reciente)

### [2026-02-23] - 📱 Fix: Barra "Entregar solicitud" tapaba contenido en móvil (QR Scanner)
- **Problema**: Al escanear un QR desde el celular, la barra sticky "Entregar solicitud 257665" se superponía sobre el detalle de ítems, impidiendo ver toda la información (ubicación, stock, etc.).
- **Causa raíz**: El botón de entrega móvil usaba `fixed bottom-20` con `backdrop-blur`, creando un overlay fijo que tapaba el contenido inferior de la página.
- **Corrección**: Cambiado de posicionamiento `fixed` a un elemento normal dentro del flujo del documento (`pb-4`). Ahora el botón de entrega aparece al final del contenido al hacer scroll, sin superponerse.
- **Archivo Modificado**: `src/components/scan/QRScannerClient.tsx` — div del CTA móvil de `fixed bottom-20 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-30` → `pb-4`.

### [2026-02-22] - 📱 Feature: QR Storage en Supabase + Webhook Enhancement
- **Objetivo**: Migrar la generación de QR de base64 inline a una imagen pública almacenada en Supabase Storage, enriquecer el webhook de n8n con campos independientes, y limpiar la imagen al entregar.
- **Supabase Storage**:
  1. ✅ **Bucket `qr-codes`** público creado via migration DDL con límite de 512KB, tipo `image/png`.
  2. ✅ **Políticas**: lectura pública, upload/delete para `authenticated`, full access para `service_role`.
- **Backend** (`src/lib/qr-utils.ts`):
  1. ✅ **`uploadQRToStorage(requestCode)`**: Genera QR como PNG 300px via `QRCode.toBuffer`, sube al bucket `qr-codes/{code}.png`, retorna URL pública.
  2. ✅ **`deleteQRFromStorage(requestCode)`**: Elimina la imagen del bucket (non-blocking, solo log de error).
- **Backend** (`src/app/requests/actions.ts`):
  1. ✅ **`createRequest()`**: Sube QR al storage, busca `telefono` del usuario desde `user_profiles`, agrega 3 campos al webhook payload:
     - `recipient_phone` — teléfono del usuario
     - `qr_image_url` — URL pública de la imagen QR en Storage
     - `request_code` — código numérico del pedido (existía pero ahora explícito)
  2. ✅ **`deliverRequest()`**: Elimina QR del storage al marcar como 'Entregada' (`deleteQRFromStorage`).
- **Archivos Modificados**:
  - `src/lib/qr-utils.ts`: Nuevas funciones `uploadQRToStorage`, `deleteQRFromStorage`.
  - `src/app/requests/actions.ts`: Import, upload QR, fetch phone, payload enriquecido, cleanup en delivery.
- **Verificado**: ✅ Página `/requests/new` carga sin errores, dev server compila correctamente.

### [2026-02-22] - 🔍 UX: Lightbox para Adjuntos (Input + Chat)
- **Problema**: Al hacer clic en una imagen adjunta en el chat, se abría una pestaña vacía (`about:blank`) porque Chrome bloquea data URIs en `target="_blank"`.
- **Correcciones**:
  1. ✅ **Lightbox en ChatBubble**: Reemplazado `<a target="_blank">` por un modal fullscreen con `AnimatePresence` + `motion.div`. Imagen centrada con fondo oscuro (`bg-black/80 backdrop-blur-sm`), botón ✕ para cerrar, y click-outside-to-close.
  2. ✅ **Lightbox en Input (pre-envío)**: Las miniaturas de adjuntos en el strip del input ahora son `<button>` clickeables. Al hacer clic se abre el mismo estilo de lightbox para verificar la imagen antes de enviar. Efecto hover `scale-105` + borde amber.
  3. ✅ **Descarga de PDFs**: Los PDFs adjuntados en mensajes del chat ahora tienen botón de descarga (`Download` icon). Convierte base64 → Blob → `URL.createObjectURL` → descarga automática.
  4. ✅ **Estado `previewLightbox`**: Nuevo state en `AssistantClient` para el lightbox del input. Return envuelto en `<>...</>` fragment para permitir `AnimatePresence` fuera de `<main>`.
  5. ✅ **Estado `lightboxImage`**: Nuevo state en `ChatBubble` para el lightbox de mensajes enviados.
- **Archivo Modificado**: `src/app/assistant/AssistantClient.tsx`

### [2026-02-22] - 👀 UX: Previsualización Visual de Adjuntos en Mensajes del Chat
- **Problema**: Al adjuntar una imagen y enviar el mensaje, el chat solo mostraba el texto `📎 nombre.png` sin la imagen real. El usuario no podía verificar visualmente qué había adjuntado.
- **Correcciones**:
  1. ✅ **Interfaz `Message` ampliada**: Nuevo campo opcional `attachmentPreviews: { url: string; name: string; type: "image" | "pdf" }[]` para almacenar datos de previsualización.
  2. ✅ **Captura de previews al enviar**: `sendMessage` convierte los archivos adjuntos a data URIs (base64) y los incluye en el mensaje del usuario antes de limpiar el estado.
  3. ✅ **Renderizado visual en ChatBubble**: Los mensajes del usuario ahora muestran:
     - **Imágenes**: Miniaturas 128x128px con bordes redondeados, clickeables para abrir en nueva pestaña.
     - **PDFs**: Tarjeta con ícono `FileText` y nombre truncado del archivo.
  4. ✅ **Texto limpio**: Se oculta la línea `📎 filename` en los mensajes, mostrando solo el texto + previews visuales.
- **Archivo Modificado**: `src/app/assistant/AssistantClient.tsx`

### [2026-02-22] - 📋 Feature: Pegar Imágenes desde Portapapeles (Ctrl+V)
- **Objetivo**: Permitir pegar capturas de pantalla directamente en el chat usando Ctrl+V, sin necesidad de seleccionar archivos manualmente.
- **Implementación**:
  1. ✅ **Handler `handlePaste`**: Intercepta eventos de pegado en el textarea. Detecta items de tipo `image/*` en el clipboard.
  2. ✅ **Conversión automática**: Las imágenes del portapapeles se convierten a base64, se genera un preview URL, y se agregan al array de adjuntos.
  3. ✅ **Nombre amigable**: Las capturas se nombran automáticamente como `Captura DD mes, HH:MM.png` usando `toLocaleString("es-CL")`.
  4. ✅ **Compatible con**: Herramienta de recortes de Windows, capturas de Chrome, copiar imagen desde cualquier app.
  5. ✅ **Sin conflicto**: Si el portapapeles contiene texto en lugar de imágenes, el pegado normal funciona sin interrupción.
- **Archivo Modificado**: `src/app/assistant/AssistantClient.tsx`

### [2026-02-22] - 📎 Feature: Adjuntar Archivos en el Chat IA (Imágenes + PDF)
- **Objetivo**: Permitir enviar imágenes y PDFs al asistente IA junto con el mensaje de texto, aprovechando la capacidad multimodal de Gemini.
- **Cambios Frontend** (`AssistantClient.tsx`):
  1. ✅ **Interfaz `Attachment`**: Nuevo tipo con `file`, `preview` (URL temporal para imágenes), `type` ("image" | "pdf"), `base64` (contenido codificado).
  2. ✅ **Handler `handleFileSelect`**: Valida tipo (JPEG, PNG, GIF, WebP, PDF) y tamaño (máx 20MB por archivo Gemini). Convierte a base64 con `FileReader`. Genera preview con `URL.createObjectURL` para imágenes.
  3. ✅ **Envío con adjuntos**: `sendMessage` captura los attachments antes de limpiar estado, los envía como array `{ base64, mimeType, fileName }` en el body del fetch a `/api/ai/chat`.
  4. ✅ **Mensaje del usuario**: Muestra indicador `📎 archivo1.png, archivo2.pdf` debajo del texto.
  5. ✅ **Cleanup**: `removeAttachment` revoca URLs temporales para liberar memoria.
- **Nuevos imports**: `Paperclip`, `FileText`, `ChevronUp` de lucide-react.
- **Archivo Modificado**: `src/app/assistant/AssistantClient.tsx`

### [2026-02-22] - 🔲 UX: Toggle de Sidebar de Chats estilo Gemini
- **Objetivo**: Permitir ocultar/mostrar el panel lateral de historial de conversaciones en desktop para maximizar el espacio del chat, igual que en Google Gemini.
- **Cambios**:
  1. ✅ **Estado `sidebarCollapsed`**: Controla la visibilidad del sidebar en desktop (independiente del `sidebarOpen` de mobile).
  2. ✅ **Botón `PanelLeftClose`** en el header del sidebar: Oculta el panel con transición suave (`transition-all duration-300`). Solo visible en desktop (`hidden md:flex`).
  3. ✅ **Botón `PanelLeftOpen`** en el header del chat: Aparece solo cuando el sidebar está colapsado. Restaura el panel al hacer clic.
  4. ✅ **Sidebar colapsado**: Se reduce a `w-0` con `overflow-hidden` y borde removido (`border-r-0`). El área de chat se expande para ocupar todo el espacio.
  5. ✅ **Mobile sin cambios**: En pantallas pequeñas sigue funcionando el menú hamburguesa con overlay.
- **Nuevos imports**: `PanelLeftClose`, `PanelLeftOpen` de lucide-react.
- **Archivo Modificado**: `src/app/assistant/AssistantClient.tsx`
- **Verificado**: ✅ Toggle funcional con animación suave, botón de restaurar aparece correctamente.

### [2026-02-22] - 🗑️ Feature: Eliminar Todos los Chats + Modal de Confirmación
- **Objetivo**: Agregar un botón de configuración en el sidebar del asistente IA que permita eliminar (soft-delete) todas las conversaciones anteriores de una sola vez.
- **Cambios Backend** (`/api/ai/conversations/route.ts`):
  1. ✅ **`DELETE ?all=true`**: Nuevo parámetro que hace soft-delete masivo — marca todas las conversaciones del usuario con `deleted_at` (misma lógica que el delete individual, pero aplicado en masa).
  2. ✅ Filtro `.is("deleted_at", null)` para no re-eliminar conversaciones ya borradas.
- **Cambios Frontend** (`AssistantClient.tsx`):
  1. ✅ **Botón "Eliminar todos los chats"**: Ubicado al fondo del sidebar, con ícono `Trash2`. Solo visible cuando hay conversaciones. Estilo discreto con hover rojo sutil.
  2. ✅ **Modal de confirmación**: Ícono `AlertTriangle`, muestra el conteo exacto de conversaciones a eliminar (ej: "7 conversaciones"), botón "Eliminar todo" con loading spinner (`Loader2`) durante la operación.
  3. ✅ **Estados `deleteAllConfirm` y `isDeletingAll`**: Controlan la visibilidad del modal y el estado de carga.
  4. ✅ **Función `deleteAllConversations`**: Llama a la API, limpia `conversations`, `activeConversation` y `messages` en el estado local.
- **Archivos Modificados**: `src/app/api/ai/conversations/route.ts`, `src/app/assistant/AssistantClient.tsx`
- **Verificado**: ✅ Botón visible, modal con conteo correcto, eliminación masiva funcional.

### [2026-02-22] - 🔔 Pulido: Toaster Sonner + NotificationBell Light Mode
- **Problema 1**: El Toaster de Sonner usaba estilos por defecto (fondo blanco) sin adaptarse al tema dark/light de la app.
- **Problema 2**: NotificationBell tenía todos sus estilos hardcoded para dark mode (bg-slate-900, border-slate-800, text-slate-400) — ilegible en modo claro.
- **Correcciones**:
  1. ✅ **`layout.tsx`**: Toaster configurado con `position="top-right"`, `richColors`, y `toastOptions.style` usando CSS variables (`--surface`, `--border`, `--foreground`).
  2. ✅ **`NotificationBell.tsx`**: 13 ediciones con variantes `dark:` — botón, dropdown, header, spinner, empty state, items, hover, timestamps, badges de estado.
- **Archivos Modificados**: `src/app/layout.tsx`, `src/components/dashboard/NotificationBell.tsx`

### [2026-02-22] - ⚡ Infra: Supabase Realtime — Replicación Habilitada
- **Problema**: Ninguna tabla tenía replicación habilitada en `supabase_realtime`. Los componentes `DashboardRealtimeSync`, `NotificationBell`, `PendingRequestsList` y `StockManager` caían a polling (30s) en vez de usar websockets en tiempo real.
- **Corrección**: Migración SQL `enable_realtime_replication`:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE material_requests;
  ALTER PUBLICATION supabase_realtime ADD TABLE request_status_log;
  ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
  ```
- **Resultado**: Dashboard ahora muestra "En vivo" (verde) en vez de "Sincro. automática" (azul). Notificaciones de nuevas solicitudes llegan instantáneamente.

### [2026-02-22] - 🏷️ UX: Badge de Categoría en Tarjetas de Inventario (Deck View)
- **Objetivo**: Mostrar la categoría de cada ítem directamente en la tarjeta del inventario para identificación rápida.
- **Cambio**: Se agregó un chip/badge discreto debajo del SKU en cada tarjeta de la vista deck con:
  - Icono `Tag` de lucide-react
  - Texto de la categoría (ej: "Electricidad", "Ropa", "Inocuidad", "Automatización")
  - Estilo neutral: `bg-slate-100 dark:bg-slate-800` con bordes sutiles, compatible dark/light mode
  - Renderizado condicional: solo se muestra si el ítem tiene categoría asignada
- **Archivo Modificado**: `src/app/inventory/page.tsx` — Import de `Tag`, nuevo `<span>` condicional.
- **Verificado**: ✅ Visible en todas las tarjetas con categoría asignada.

### [2026-02-22] - ⚡ Feature: Panel de Cambio de Modelo IA + Gestión de API Keys
- **Objetivo**: Permitir cambiar de modelo Gemini y rotar API Keys directamente desde El Maestro cuando se agotan los créditos.
- **Cambios Backend**:
  1. ✅ **`POST /api/ai/test-model`** — Endpoint que envía un ping mínimo a un modelo Gemini para verificar disponibilidad. Retorna: `available`, `latency`, `error` (cuota agotada 429, modelo no encontrado 404, timeout, etc).
  2. ✅ **`PATCH /api/ai/config`** — Permite a cualquier usuario autenticado cambiar el modelo activo (sin requerir admin). Decisión de diseño: es una acción operacional, no de seguridad.
  3. ✅ **`/api/ai/api-keys` (GET/POST/PATCH)** — CRUD de API Keys. GET lista keys con máscara. POST guarda nueva key y la activa. PATCH activa una key existente por ID.
  4. ✅ **Migración Supabase**: Tabla `ai_api_keys` (id, api_key, label, key_preview, created_by, created_at) con RLS.
- **Cambios Frontend** (`assistant/page.tsx`):
  1. ✅ **Botón ⚙️ Modelo** en header del chat → abre panel animado
  2. ✅ **Grid de 6 modelos Gemini** con verificación automática en paralelo al abrir
  3. ✅ **Estados visuales**: ✅ Disponible (con latencia ms) / ❌ Error (detalle) / 🔄 Verificando
  4. ✅ **Badge "ACTIVO"** en modelo actual + botón "Usar →" solo en modelos disponibles
  5. ✅ **Botón cerrar (X)** en el header del panel
  6. ✅ **Sección "API Keys de Gemini"** colapsable: lista keys guardadas con badge "EN USO", formulario para agregar nueva key (nombre + key con toggle visibilidad), botón "Guardar y usar esta Key", link a aistudio.google.com
  7. ✅ **Auto re-test**: Al cambiar API Key, se re-verifican todos los modelos automáticamente
- **Nombres de modelos corregidos** (verificado contra [docs oficiales](https://ai.google.dev/gemini-api/docs/models)):
  - `gemini-3-flash` → `gemini-3-flash-preview`
  - `gemini-3-pro` → `gemini-3-pro-preview`
  - Corregido en `assistant/page.tsx` y `AIConfigPanel.tsx`
- **Archivos Creados**: `src/app/api/ai/test-model/route.ts`, `src/app/api/ai/api-keys/route.ts`
- **Archivos Modificados**: `src/app/assistant/page.tsx`, `src/app/api/ai/config/route.ts`, `src/app/admin/AIConfigPanel.tsx`
- **Build**: ✅ Compilación exitosa, verificado en navegador

### [2026-02-22] - 🤖 Mejora: El Maestro — Interpretación Contextual de Preguntas
- **Problema**: Cuando el usuario preguntaba "recomiéndame los de PU o nitrilo para corte", El Maestro no entendía que se refería a **guantes**. Buscaba literalmente "PU" o "nitrilo" como texto suelto y no encontraba resultados.
- **Corrección**: Nueva sección **INTERPRETACIÓN CONTEXTUAL** en el system prompt con 6 reglas:
  1. ✅ **Deducción de producto implícito**: "los de PU" → guantes de PU, "las N95" → mascarillas, "los 6011" → electrodos E6011.
  2. ✅ **Asociación material→producto**: PU/nitrilo/cuero = guantes, Kevlar = guantes anticorte, policarbonato = lentes.
  3. ✅ **Contexto del trabajo**: Si mencionan "corte" o "soldadura", deduce TODOS los EPP necesarios.
  4. ✅ **Preguntas comparativas**: "¿PU o nitrilo para corte?" = comparación técnica de guantes fundamentada.
  5. ✅ **Búsqueda inteligente**: Busca "guantes nitrilo", NO solo "nitrilo".
  6. ✅ **Preguntas básicas**: No pide detalles innecesarios, busca directamente.
- **Mejora adicional**: Regla de múltiples búsquedas al comparar alternativas.
- **Archivo Modificado**: `src/lib/ai-data.ts` (función `buildSystemPrompt`)

### [2026-02-22] - 🤖 Mejora: El Maestro — Tono Formal + Conocimiento Técnico + Validación con Superiores
- **Problema**: El Maestro tenía un tono demasiado casual/chistoso y no sabía responder preguntas técnicas sobre EPP o herramientas, diciendo que "solo maneja temas de inventario".
- **Correcciones aplicadas**:
  1. ✅ **Tono formal**: Trata de "usted", tono técnico y profesional, sin chistes ni expresiones coloquiales.
  2. ✅ **Emojis reducidos**: Solo indicadores funcionales (📊📍⚠️✅), eliminados los decorativos (⚡🔧🔩🛡️📦).
  3. ✅ **Conocimiento técnico agregado**:
     - Guantes: nitrilo, PU, cuero, anticorte (ANSI A1-A9), dieléctricos, soldador — recomendación por riesgo.
     - Protección respiratoria: N95, P100, respiradores, filtros por contaminante.
     - Protección visual: antiparras, lentes de seguridad, caretas, soldadura.
     - Protección auditiva: NRR, tapones vs. orejeras, doble protección.
     - Protección contra caídas: arneses, líneas de vida, normativa chilena (≥1.8m).
     - Ropa de protección: ignífuga (FR), antiácida, alta visibilidad, térmica.
     - Rodamientos: tipos, sellos, carga y velocidad.
     - Herramientas de corte: discos según material, RPM.
     - Soldadura: electrodos, alambres MIG/TIG, gases.
     - Productos químicos: lubricantes, desengrasantes, SDS.
  4. ✅ **Protocolo de validación**: Siempre cierra recomendaciones técnicas con nota de validar con el Prevencionista de Riesgos o supervisor del área.
  5. ✅ **Alcance ampliado**: Ahora responde consultas de inventario + recomendaciones técnicas + seguridad industrial.
- **Archivo Modificado**: `src/lib/ai-data.ts` (función `buildSystemPrompt`)


### [2026-02-22] - 🔧 Fix: Sincronización Supabase — Duplicados SKU + Reemplazo de RPC
- **Problema**: El asistente IA "El Maestro" detectaba solo 83 ítems cuando debían ser 114. La sincronización Google Sheets → Supabase fallaba por dos razones:
  1. La función RPC `sync_inventory` rechazaba columnas desconocidas (`component_type`, `model`, `power_rating`).
  2. Ítems con mismo SKU pero diferente talla (ej: guantes S, M, L, XL) violaban la restricción de PRIMARY KEY.
- **Corrección**:
  1. ✅ Reemplazada la llamada RPC por operación directa `delete all + insert en lotes` (batches de 50).
  2. ✅ Agregada lógica de deduplicación por SKU: agrupa variantes de talla, suma stocks, combina tallas ("S, M, L, XL").
  3. ✅ Removidas columnas desconocidas del payload (`component_type`, `model`, `power_rating`).
  4. ✅ Logging detallado: "Grouped 114 sheet rows into 83 unique SKUs".
- **Resultado**: 114 filas de Google Sheets → 83 SKUs únicos sincronizados correctamente en Supabase.
- **Archivo Modificado**: `src/app/api/ai/sync-inventory/route.ts`

### [2026-02-22] - 🔧 Fix: Actualización de Mapeo de Columnas — 3 nuevas columnas en Google Sheets
- **Problema**: Se agregaron 3 nuevas columnas a la hoja ITEMS de Pañol_DB: **Tipo de componente** (C), **Modelo** (F), **Potencia** (G). Esto desplazó todas las columnas posteriores, rompiendo la lectura de inventario, el descuento de stock y el mapeo completo de datos.
- **Impacto anterior**: Talla leía Marca, Link_Foto leía Modelo, Stock leía Potencia → todo el inventario mostraba datos incorrectos y el stock se escribía en la columna equivocada.
- **Correcciones aplicadas**:
    1. ✅ **`data.ts`**: Agregados 3 campos al interfaz `InventoryItem` (`tipo_componente`, `modelo`, `potencia`). Range actualizado `ITEMS!A2:S` → `ITEMS!A2:V`. Todos los `row[N]` actualizados (talla 4→7, linkFoto 5→8, stock 6→9, reservado 7→10, estante_nro 8→12, estante_nivel 9→13, observacion 10→14, etc).
    2. ✅ **`sheets-mutations.ts`**: 4 funciones actualizadas (`syncStockToSheets`, `restoreStockInSheets`, `addStockInSheets`, `removeStockInSheets`). Range `ITEMS!A2:G` → `ITEMS!A2:J`. Talla `row[4]` → `row[7]`. Stock `row[6]` → `row[9]`. Escritura `ITEMS!G` → `ITEMS!J`.
    3. ✅ **`sync-inventory/route.ts`**: 3 nuevos campos en la sincronización Sheets→Supabase (`component_type`, `model`, `power_rating`).
    4. ✅ **`gemini.md`**: Schema ITEMS actualizado con las 21 columnas (A-U).
- **Archivos Modificados** (4):
    - `src/lib/data.ts`
    - `src/lib/sheets-mutations.ts`
    - `src/app/api/ai/sync-inventory/route.ts`
    - `gemini.md`
- **Build**: ✅ Compilación exitosa sin errores TypeScript, 20/20 páginas generadas.

### [2026-02-22] - 🎨 Dark Mode: Eliminación total de azul → Paleta neutral gris estilo Apple macOS
- **Objetivo**: Reemplazar TODOS los acentos azules del modo oscuro con grises neutros profesionales.
- **globals.css**:
  - `--brand`: `#0a84ff` → `#5a5a5a` (gris neutro)
  - Overrides masivos CSS: remap de `bg-blue-*`, `text-blue-*`, `border-blue-*`, `shadow-blue-*`, gradientes `from-blue/to-indigo` → grises neutros en `:root.theme-dark`
- **AppSidebar.tsx**: Labels "NAVEGACIÓN"/"ADMINISTRACIÓN" y Admin badge de azul → slate neutro
- **inventory/page.tsx**: Header icon `bg-blue-600` → `bg-slate-700`. Búsqueda focus ring azul → gris. SKU text, category tags, botón "Ver detalle", hover text de azul → slate neutro
- **ProfileForm.tsx**: Welcome banner, iconos de sección (Datos Personales, Datos Laborales) de azul/indigo → slate. Focus rings de 4 inputs de `ring-blue-500` → `ring-slate-400`. Botón "Guardar" de `bg-blue-600` → `bg-slate-700`
- **WebhookConfigPanel.tsx**: Indicador dot, loader spinner, URL text de azul → slate
- **admin/page.tsx**: Icono Users de `text-blue-500` → `text-slate-400`
- **FilterCombobox.tsx**: Focus ring/border, selected items highlight, checkbox background de azul → slate
- **InventoryControls.tsx**: Active filter tags (categoría, SKU, nombre, talla) de `bg-blue/sky/violet/indigo-500` → `bg-slate-500`
- **Archivos Modificados** (7):
  - `src/app/globals.css`
  - `src/components/layout/AppSidebar.tsx`
  - `src/app/inventory/page.tsx`
  - `src/components/profile/ProfileForm.tsx`
  - `src/app/admin/WebhookConfigPanel.tsx`
  - `src/app/admin/page.tsx`
  - `src/components/ui/FilterCombobox.tsx`
  - `src/components/inventory/InventoryControls.tsx`
- **Modo claro**: Sin cambios → mantiene azul brand original

### [2026-02-22] -  Fix: Error de hidratación + Indicador de datos
- **Bug**: Error de hidratación por botones anidados (`<button>` dentro de `<button>`) en la lista de conversaciones del asistente IA
- **Solución**: Cambiado el elemento contenedor de cada conversación de `<button>` a `<div role="button">`, manteniendo accesibilidad con `tabIndex` y `onKeyDown`
- **Mejora**: Agregado indicador de frescura de datos e inventario en el header del chat con timestamp y botón "Actualizar datos" (llama a `/api/revalidate-inventory`)
- **Mejora**: Lista de modelos Gemini actualizada (3.1 Pro, 3 Pro, 3 Flash, 2.5 Pro, 2.5 Flash, 2.5 Flash Lite) y modelo por defecto cambiado a `gemini-2.5-flash`


### [2026-02-22] -  **Asistente IA "Chispita"  Sistema completo de chatbot inteligente**
- **Funcionalidad**: Implementación completa de un asistente de IA integrado al pañol.
- **Base de Datos (Supabase)**:
  - Tabla `ai_conversations`: Historial de conversaciones por usuario (RLS habilitado)
  - Tabla `ai_messages`: Mensajes individuales (user/assistant) con CASCADE delete
  - 5 nuevas entradas en `app_settings`: ai_provider, ai_api_key, ai_model, ai_bot_name, ai_openrouter_key
  - Permiso `ai_assistant` en `role_permissions` para Operador
- **Backend (API Routes)**:
  - `/api/ai/chat`: Endpoint principal con streaming SSE (soporta Gemini y OpenRouter)
  - `/api/ai/conversations`: CRUD de conversaciones (GET/POST/DELETE)
  - `/api/ai/conversations/[id]/messages`: Mensajes por conversación
  - `/api/ai/config`: Configuración IA (GET/PUT, admin only)
  - `src/lib/ai-data.ts`: Helper que construye contexto del inventario completo para el system prompt
- **Frontend**:
  - Página `/assistant` con interfaz de chat premium (dark/light mode)
  - Sidebar de historial de conversaciones con botón "Nueva conversación"
  - Pantalla de bienvenida con 4 sugerencias de preguntas
  - Streaming de respuestas con indicador de typing (3 puntos animados)
  - Renderizado de Markdown en respuestas del bot (headers, listas, bold, code, links)
  - Responsive mobile con sidebar drawer
  - Animaciones con framer-motion
- **Admin**: Panel `AIConfigPanel` en Configuración Avanzada para gestionar proveedor, modelo, API key y nombre del bot
- **Navegación**: Agregado "Asistente IA" al sidebar con icono Bot de lucide-react
- **Modelos actualizados**: Lista de modelos Gemini actualizada a Feb 2026 (3.1 Pro, 3 Pro, 3 Flash, 2.5 Pro, 2.5 Flash, 2.5 Flash Lite). Removidos modelos 1.5 y 2.0 (deprecados).
- **Modelo por defecto**: `gemini-2.5-flash` (equilibrio entre velocidad y calidad)
- **Build**: Compilación exitosa sin errores TypeScript


### [2026-02-21] - [x] **Ejecución Local**: Iniciar servidor de desarrollo en localhost:3000
- **Tarea**: El usuario solicitó ejecutar el proyecto localmente.
- **Acción**: Se ejecutó `npm run dev` en la carpeta `app/`.
- **Estado**: Servidor activo y escuchando en `http://localhost:3000`.
- **SOP**: Creado `architecture/run_locally.md` para referencia futura.

### [2026-02-18] - 🔧 Fix: Toggle de Tema instantáneo + Consistencia de colores en Modo Claro
- **Problema 1**: El cambio de modo oscuro a claro (y viceversa) tardaba varios segundos en reflejarse, y el botón quedaba bloqueado sin permitir otros clics hasta que la UI se actualizara.
- **Causa raíz**: `ThemeToggle.tsx` usaba `useSyncExternalStore` con `subscribeTheme` que escuchaba `storage` events y `prefers-color-scheme`. El evento `storage` **no se dispara en la misma pestaña** (solo cross-tab), por lo que el componente nunca se re-renderizaba tras el click. El re-render dependía de un trigger externo aleatorio.
- **Solución**: Reescrito `ThemeToggle.tsx` usando `useState` + `useEffect`. Al hacer click, `setTheme(nextTheme)` actualiza el estado de React de forma **síncrona e inmediata**, junto con `applyTheme()` y `localStorage.setItem()`. También se añadió un listener `storage` para sincronización cross-tab y `prefers-color-scheme` para cambios del sistema.
- **Problema 2**: En modo claro, múltiples elementos del dashboard mostraban fondos gris oscuro y texto ilegible (blanco sobre blanco).
- **Causa raíz**: Las CSS overrides de light mode cubrían `bg-slate-900/50`, `bg-slate-900/60`, `bg-slate-900/80` pero **NO** `bg-slate-900/70`, que era usado en todas las tarjetas KPI del dashboard. Además, textos con clases hardcoded `text-white`, `text-slate-200`, `text-slate-300` no tenían variante `dark:`.
- **Correcciones aplicadas**:
    1. ✅ **`ThemeToggle.tsx`**: Reescrito con `useState`/`useEffect` para toggle instantáneo. Botón ahora tiene estilos light/dark adecuados.
    2. ✅ **`globals.css`**: Añadido `bg-slate-900/70` a las CSS overrides globales Y a las light-mode overrides. Añadidos overrides para: cyan accents, rose accents, progress bar tracks, sidebar gradient, headings `text-white`, `bg-slate-50`, `bg-slate-100`, `bg-white`.
    3. ✅ **`page.tsx` (Dashboard)**: ~12 textos hardcoded como `text-slate-200`, `text-slate-300`, `text-white` convertidos a `text-slate-700 dark:text-slate-300` (o equivalente). Progress bars `bg-slate-800` → `bg-slate-200 dark:bg-slate-800`.
    4. ✅ **`requests/new/page.tsx` (Carrito)**: `text-white` → `text-slate-900 dark:text-white`. `text-slate-400` → `text-slate-500 dark:text-slate-400`.
- **Archivos Modificados**:
    - `src/components/layout/ThemeToggle.tsx`: Reescritura completa.
    - `src/app/globals.css`: Nuevas CSS rules para light mode.
    - `src/app/page.tsx`: ~12 cambios de colores hardcoded a variantes dark/light.
    - `src/app/requests/new/page.tsx`: Fix heading y descripción.
- **Resultado**: Toggle de tema **instantáneo** (0 delay). KPI cards con fondo blanco en light mode. Textos legibles en ambos modos.

### [2026-02-18] - 🔧 Fix: Caché se invalida en cada carga de página + Botón "Actualizar Datos" se re-activa
- **Problema 1**: Al modificar registros manualmente en Google Sheets, la app seguía mostrando datos desactualizados incluso al recargar la página. El caché in-memory de 60 segundos persistía entre requests del servidor, sirviendo datos viejos.
- **Problema 2**: El botón "Actualizar Datos" funcionaba una sola vez y luego se bloqueaba permanentemente. El cooldown de 10 segundos nunca expiraba visualmente porque no había un mecanismo de re-render que actualizara el estado `isInCooldown`.
- **Causa raíz (Problema 1)**: La función `getInventory()` en `data.ts` verificaba el caché in-memory antes de hacer fetch a Google Sheets. Aunque la página tenía `force-dynamic`, el proceso Node.js mantenía el caché válido entre requests HTTP consecutivos.
- **Causa raíz (Problema 2)**: `isInCooldown` se calculaba como `Date.now() - lastRefresh < COOLDOWN_MS` una sola vez durante el render. No existía ningún `useEffect` con timer que forzara un re-render cuando los 10 segundos expiraran, por lo que el botón quedaba deshabilitado indefinidamente hasta una navegación completa.
- **Correcciones aplicadas**:
    1. ✅ **`inventory/page.tsx`**: Se importó `invalidateInventoryCache` y se llama **antes** de `getInventory()` en cada carga de página. Esto garantiza que cada visita/recarga obtiene datos frescos directamente de Google Sheets.
    2. ✅ **`InventoryActionToolbar.tsx`**: Nuevo estado `cooldownRemaining` con `useEffect` + `setInterval` que cuenta hacia atrás cada segundo. Cuando el timer llega a 0, `setCooldownRemaining(0)` fuerza un re-render y `isInCooldown` se evalúa como `false`, re-habilitando el botón automáticamente.
- **Archivos Modificados**:
    - `src/app/inventory/page.tsx`: Import de `invalidateInventoryCache`, llamada antes de `getInventory()`.
    - `src/components/inventory/InventoryActionToolbar.tsx`: Nuevo estado `cooldownRemaining`, `useEffect` con `setInterval` para countdown, `isInCooldown` basado en `cooldownRemaining > 0`.
- **Resultado**: Los cambios manuales en Google Sheets se reflejan inmediatamente al recargar la página. El botón "Actualizar Datos" se re-habilita automáticamente después de 10 segundos.

### [2026-02-18] - 🔐 Config: Login OAuth usa SIEMPRE origin dinámico (`window.location.origin`)
- **Objetivo**: Asegurar que el login con Google (Supabase OAuth) use siempre la URL dinámica del navegador como `redirectTo`, de forma que funcione correctamente tanto desde `localhost:3000` como desde la IP de red local (`192.168.x.x:3000`) o el dominio de producción.
- **Configuración Verificada**:
    1. ✅ **`login/page.tsx`** — `signInWithOAuth({ redirectTo: \`${window.location.origin}/auth/callback\` })` — Usa `window.location.origin` explícitamente, nunca una URL hardcodeada. Esto es **CLAVE**: redirige siempre a la URL desde donde el usuario abrió la app.
    2. ✅ **`auth/callback/route.ts`** — El callback extrae el `origin` de `request.url` y también maneja `x-forwarded-host` para entornos con load balancer en producción. Redirect final usa el origin correcto tanto en desarrollo como en producción.
- **Cambio Aplicado**: `location.origin` → `window.location.origin` en `login/page.tsx` para mayor claridad y adherencia a la recomendación oficial de Supabase.
- **Archivos Modificados**:
    - `src/app/login/page.tsx`: `redirectTo` actualizado a `window.location.origin`.
- **Nota**: No se necesitan cambios adicionales en la configuración de Supabase Dashboard, siempre y cuando las Redirect URLs incluyan las URLs de desarrollo y producción (ej: `http://localhost:3000/**`, `http://192.168.x.x:3000/**`, `https://tu-dominio.com/**`).

### [2026-02-18] - 📱 Feature: Escáner QR para Administradores (`/scan`)
- **Objetivo**: Permitir a los administradores escanear el código QR de una solicitud (o ingresar el código de 6 dígitos manualmente) desde el celular o PC, ver los detalles enriquecidos (stock, ubicación en estante) y entregar la solicitud con un botón.
- **Dependencia Instalada**: `html5-qrcode` — Librería para acceso a cámara y decodificación de QR vía browser.
- **Archivos Creados**:
    - `src/app/scan/page.tsx` — Página server con verificación de rol admin. Redirige a `/login` si no autenticado, muestra "Acceso Denegado" si no es admin.
    - `src/components/scan/QRScannerClient.tsx` — Componente cliente con 3 vistas:
        1. **Scanner**: Sección de cámara (botón "Activar cámara" / "Detener") + sección de ingreso manual (input numérico + botón "Buscar").
        2. **Result**: Header con código, status badge, nombre/área/fecha. Tabla de ítems enriquecidos: SKU, nombre, badges de marca/talla/categoría, cantidad solicitada, **ubicación** (Estante/Nivel) en ámbar, **stock actual** con colores condicionales (verde si suficiente, naranja si bajo, rojo si cero). Botón "Entregar" en emerald. CTA sticky en mobile.
        3. **Delivered**: Animación de éxito con check pulsante, resumen y botón "Escanear otro código".
- **Archivos Modificados**:
    - `src/app/requests/actions.ts`: Nueva función `lookupRequestByCode(code)` — Busca en `material_requests` por `request_code`, enriquece cada ítem con datos de inventario (`getInventoryBySKUs`) incluyendo `stock_actual`, `estante_nro`, `estante_nivel`, `nombre_inventario`, `categoria`. Protegida con `getAdminContext()`.
    - `src/constants/navigation.ts`: Nuevo ítem admin `{ key: "scan_qr", label: "Escanear QR", href: "/scan", icon: ScanLine }` como primer elemento del grupo "admin".
    - `src/app/globals.css`: Overrides CSS para `html5-qrcode` (fondo transparente, botones con `var(--brand)`, selects con `var(--surface)`, ocultar info icon).
- **Verificado**: Página carga sin errores. Sidebar muestra "Escanear QR" como primer ítem de Administración. Cámara, input manual, y botón de búsqueda funcionales.

### [2026-02-18] - 🔧 Fix: Crash de cámara en PC (html5-qrcode + React DOM conflict)
- **Problema**: Al presionar "Activar cámara" en PC, la app crasheaba con `RuntimeError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node`.
- **Causa Raíz**: Se usaba `Html5QrcodeScanner` (API de alto nivel) que inyecta su propio HTML (botones, selects, textos) dentro del div contenedor. Cuando React intentaba reconciliar/limpiar ese DOM modificado externamente, el conflicto de ownership causaba el crash.
- **Solución**: Reescrito para usar `Html5Qrcode` (API de bajo nivel) que solo renderiza el stream de video sin inyectar UI propia → cero conflicto con React.
- **Mejoras adicionales**:
    - Mensajes de error claros para: permiso denegado, cámara no encontrada, cámara en uso por otra app.
    - `isMountedRef` para evitar `setState` en componente desmontado.
    - `stopScanner` verifica estado del scanner antes de llamar `.stop()`.
- **Archivos Modificados**:
    - `src/components/scan/QRScannerClient.tsx`: Reescritura de la lógica de cámara.
- **Verificado**: Página ya no crashea al activar cámara en PC.

### [2026-02-18] - 🎨 UX: Sidebar Profesional (Headers, Colapso, Toggle)
- **Problema**: Los headers de sección "NAVEGACIÓN" y "ADMINISTRACIÓN" tenían el mismo estilo (mono, gris, uppercase), lo que hacía difícil distinguirlos. Además, "Navegación" no era colapsable y no había forma de ocultar la barra lateral.
- **Mejoras Aplicadas**:
    1. ✅ **Headers diferenciados por color**: "Navegación" ahora usa un badge con icono `Compass` en **azul** (bg-blue-500/15, text-blue-600). "Administración" usa badge con `Shield` en **ámbar** (bg-amber-500/15, text-amber-600). Ambos tienen texto `font-semibold` coloreado en vez de `font-mono text-slate-500`.
    2. ✅ **Navegación colapsable**: Ahora tiene su propia flecha `ChevronDown` con toggle, idéntico al comportamiento de Administración. Se auto-expande si hay una ruta de navegación activa.
    3. ✅ **Botón de colapso del sidebar**: Botón circular (`w-6 h-6`) posicionado en el borde derecho del sidebar (`-right-3`) con chevron izquierda/derecha. Al colapsarlo, el sidebar pasa de `w-64` a `w-[72px]` mostrando solo iconos. El estado se persiste en `localStorage` (`sidebar-collapsed`).
    4. ✅ **Modo colapsado**: Logo solo muestra icono, links solo muestran icono con `title` tooltip, perfil de usuario muestra solo avatar, separadores de sección se reducen a una línea horizontal sutil.
- **Archivos Modificados**:
    - `src/components/layout/AppSidebar.tsx`: Reescritura con estados `navMenuOpen`, `collapsed`, componente `SectionHeader` reutilizable, renderizado condicional para modo colapsado.
- **Verificado**: HTTP 200, sin errores de compilación.

### [2026-02-18] - 🎨 Rediseño: Página de Detalle de Solicitud (Stitch MCP + Skill UI)
- **Objetivo**: La página de detalle de solicitud (`/my-orders/[id]`) se veía desorganizada y con mala distribución del espacio. Los elementos (QR, info de registro, detalle de materiales) estaban apilados linealmente sin aprovechar el espacio horizontal.
- **Proceso Stitch MCP**:
    - Proyecto Stitch creado: `projects/256534779076079536` ("Mejora Detalle de Solicitud - Pañol")
    - Screen generada: `screens/7a9a74eb914649f2851818ee6c2913b5` — Mockup desktop premium con glassmorphism, layout de 2 columnas, KPI strip segmentado.
    - El HTML generado por Stitch sirvió como referencia visual para la implementación.
- **Problemas Identificados en el Diseño Original**:
    1. ❌ **QR code aislado** → Centrado/alineado a la izquierda sin contexto, ocupando espacio vertical sin necesidad.
    2. ❌ **Layout 100% vertical** → Todo apilado: header, QR, materiales, info registro. No aprovechaba el espacio horizontal en desktop.
    3. ❌ **Info de Registro desconectada** → Sin glassmorphism (`ui-card`), con fondo `bg-slate-900` plano.
    4. ❌ **Header disperso** → Código, status, fecha y resumen desalineados.
    5. ❌ **Sin footer de total** → El total de la solicitud no tenía un resumen visual al final de los materiales.
    6. ❌ **Sin badges de marca/talla** → Los ítems no mostraban datos complementarios (brand, size).
    7. ❌ **Sin iconos en info de registro** → Las filas de datos no tenían iconos identificadores.
- **Mejoras Aplicadas (inspiradas en Stitch + skill `experto-tailwindcss-ui`)**:
    1. ✅ **Hero Header Card** con `ui-card rounded-2xl` glassmorphism → Header unificado con código, status y fecha.
    2. ✅ **KPI Strip segmentado** → Total Items | Valor Total | Área — en un strip horizontal con separadores verticales y fondo `color-mix(in oklab, var(--surface) 70%, transparent)`.
    3. ✅ **Layout 2 columnas** (QR + Info Registro) → Grid `md:grid-cols-5`: QR ocupa 2/5, Info de Registro ocupa 3/5.
    4. ✅ **QR Card mejorada** → Centrada verticalmente en su card, con subtexto descriptivo y padding envolvente.
    5. ✅ **Info de Registro con header + iconos** → Cada fila tiene icono (User, Mail, Hash), header con `ShieldCheck`, separadores sutiles con `color-mix`.
    6. ✅ **Header de materiales con badge contador** → "3 ítems" en pill azul al lado del título.
    7. ✅ **Footer de total** → Fila inferior en la card de materiales con "Total Solicitud: $X.XXX" en emerald.
    8. ✅ **Badges de marca y talla** → Cada ítem muestra SKU (azul), marca (celeste), talla (púrpura) y precio unitario (esmeralda).
    9. ✅ **Hover CSS puro** → `order-detail-item-row:hover` en `globals.css` (no event handlers inline, compatible con Server Components).
    10. ✅ **Notas generales** → Box con borde izquierdo amarillo y fondo sutil.
    11. ✅ **CSS variables** → Todos los colores usan `var(--foreground)`, `var(--brand)`, `var(--muted)`, `var(--surface)`, `var(--border)` para compatibilidad automática dark/light.
    12. ✅ **Responsive** → `flex-col lg:flex-row` en header, `grid-cols-1 md:grid-cols-5` en QR/Info, componentes se apilan en mobile.
- **Fix Aplicado**: Eliminados `onMouseEnter`/`onMouseLeave` inline (prohibidos en Server Components de Next.js). Reemplazados por clase CSS `.order-detail-item-row:hover`.
- **Archivos Modificados**:
    - `src/app/my-orders/[id]/page.tsx`: Reescritura completa del layout.
    - `src/app/globals.css`: Nueva regla `.order-detail-item-row:hover`.
- **Verificado**: HTTP 200 en la página, sin errores de compilación.

### [2026-02-18] - 🔄 Fix: Sincronización en tiempo real Google Sheets → Inventario
- **Problema**: Al editar stock directamente en Google Sheets (ej: cambiar talla L de 6 a 20), la app no reflejaba el cambio ni con el botón "Actualizar Datos" ni al recargar la página.
- **Causa raíz**: 
    1. **Caché in-memory con TTL de 5 minutos** — Los datos se cacheaban en `data.ts` y no se refrescaban aunque se invalidara la caché, porque el TTL era demasiado largo.
    2. **Next.js Full Route Cache** — La página `/inventory` no tenía `export const dynamic = 'force-dynamic'`, por lo que Next.js podía servir versiones cacheadas del Server Component.
    3. **API de revalidación** — El endpoint `POST /api/revalidate-inventory` invalidaba el caché pero no pre-cargaba datos frescos, dejando una ventana donde la página se renderizaba sin datos actualizados.
- **Correcciones aplicadas**:
    - `app/inventory/page.tsx`: Agregado `export const dynamic = 'force-dynamic'` y `export const revalidate = 0` para forzar renderizado dinámico siempre.
    - `lib/data.ts`: TTL del caché reducido de 5 minutos a **60 segundos**. Ahora al recargar la página, los datos de Google Sheets se refrescan cada minuto como máximo.
    - `app/api/revalidate-inventory/route.ts`: Ahora el endpoint POST no solo invalida el caché, sino que también **pre-carga datos frescos** llamando `getInventory()` inmediatamente después de invalidar, asegurando que el caché se llena con datos actualizados de Sheets antes de que la página se re-renderice.
- **Resultado verificado**: Se cambió stock de talla L a 20 en Google Sheets → botón "Actualizar Datos" → la app muestra **20** correctamente. Recarga de página (F5) también funciona.
- **Archivos modificados**:
    - `src/app/inventory/page.tsx` (force-dynamic)
    - `src/lib/data.ts` (TTL 60s)
    - `src/app/api/revalidate-inventory/route.ts` (pre-fetch tras invalidación)

### [2026-02-18] - 📱 Código de Seguimiento Numérico (6 dígitos) + QR Codes
- **Objetivo**: Simplificar el código de seguimiento de solicitudes y agregar códigos QR en múltiples puntos del flujo para facilitar el retiro de materiales.
- **Cambios Realizados**:
  1. ✅ **Código numérico de 6 dígitos**: El antiguo formato `REQ-XXXXXX-YYYY` fue reemplazado por un código puramente numérico aleatorio de 6 dígitos (ej: `482917`). Generado con `Math.floor(100000 + Math.random() * 900000)`.
  2. ✅ **QR en pantalla de confirmación**: Al enviar una solicitud exitosamente, la pantalla de confirmación ahora muestra un código QR escaneable debajo del código de seguimiento, con la leyenda "Presenta este QR al retirar".
  3. ✅ **QR en correo de confirmación**: El email HTML de confirmación ahora incluye una sección de QR al final del cuerpo del correo, antes del footer. El QR se genera como imagen base64 embebida (data URL) para máxima compatibilidad con clientes de correo.
  4. ✅ **QR en detalle de solicitud ("Mis Solicitudes")**: Al abrir una solicitud individual en `/my-orders/[id]`, se muestra el código QR debajo de la información del encabezado.
  5. ✅ **Placeholder actualizado**: El campo de búsqueda por código en "Administrar Solicitudes" se actualizó de `REQ-...` a `Ej: 482917`.
- **Nuevas Dependencias**:
  - `qrcode` + `@types/qrcode` — Librería para generar QR codes como Data URLs (client + server).
- **Nuevos Archivos**:
  - `src/components/ui/QRCodeDisplay.tsx` — Componente cliente reutilizable que renderiza un QR con tema oscuro (slate-200 sobre slate-950), label opcional, y skeleton loading.
  - `src/lib/qr-utils.ts` — Utilidad server-side para generar QR como base64 data URL (colores claros para emails).
- **Archivos Modificados**:
  - `src/app/requests/actions.ts`: `generateRequestCode()` simplificado a 6 dígitos numéricos. Import de `generateQRCodeDataUrl`. Generación de QR en `createRequest()`. Sección QR agregada al template HTML del email. Response incluye `qrDataUrl`.
  - `src/components/requests/CreateRequestForm.tsx`: Import de `QRCodeDisplay`. Estado `submitResult` extendido con `qrDataUrl`. QR renderizado en pantalla de éxito.
  - `src/app/my-orders/[id]/page.tsx`: Import y renderizado de `QRCodeDisplay` con el `request_code` de la solicitud.
  - `src/app/requests/pending/page.tsx`: Placeholder `REQ-...` → `Ej: 482917`.
- **Nota**: Los códigos de solicitudes existentes (formato `REQ-*`) siguen funcionando sin problemas. Las nuevas solicitudes generarán códigos con el nuevo formato numérico.

### [2026-02-18] - Unificación de Layout: Solicitudes no entregadas en card único
- **Objetivo**: La sección "Solicitudes no entregadas" tenía el header (título + contadores) y la tabla/lista como elementos separados en el DOM. Esto causaba una inconsistencia visual con la sección "Historial de solicitudes procesadas" que sí estaba contenida dentro de un único `ui-card`.
- **Problema anterior**: El header (`ui-card` con título, descripción, badges de Pendientes/Total) era un `div` independiente con `mb-6`, y el componente `PendingRequestsList` renderizaba como un bloque aparte debajo. Visualmente parecían dos elementos desconectados.
- **Solución aplicada**:
    - Envuelto tanto el header como `PendingRequestsList` dentro de un **único `div.ui-card`** con `rounded-2xl overflow-hidden border-l-4 border-l-blue-500`.
    - El header interno ahora usa `px-5 py-4 border-b border-slate-800 bg-slate-900/70` — un patrón idéntico al header del historial (`bg-slate-900/70 flex items-start justify-between`).
    - Eliminado el `mb-6` y `p-5 md:p-6` del header antiguo ya que el padding lo controla el contenedor padre.
    - La sección `PendingRequestsList` se renderiza como hijo directo del card, haciendo que los filtros de estado y la tabla formen parte visual del mismo contenedor.
- **Resultado**: Ambas secciones (no entregadas y procesadas) ahora tienen la misma estructura: Card → Header con border-bottom → Contenido.
- **Archivos Modificados**:
    - `src/app/requests/pending/page.tsx`: Restructuración del JSX de la sección 1.
- **Verificado**: Screenshot confirma layout unificado y consistente. Sin dobles bordes ni problemas de alineación.

### [2026-02-18] - 🔧 Desacoplamiento: Google Sheets como única fuente de verdad de inventario
- **Objetivo**: Eliminar la dependencia de la tabla `inventory` de Supabase para operaciones de stock. Google Sheets (`Pañol_DB`) es y siempre será la fuente de verdad.
- **Problema anterior**: El sistema mantenía stock en 2 lugares (Supabase `inventory` + Google Sheets). Ambos se desincronizaban. La tabla `inventory` no tenía columna `talla`, generando bugs para ítems con variantes de talla.
- **Solución aplicada (NIVEL VERDE — solo código, cero migraciones)**:
    - **`app/requests/actions.ts` — `deliverRequestRPC`**: Reemplazado el RPC `process_delivery` por queries directas. Solo actualiza `material_requests.status` a 'Entregada' y registra movimientos en `stock_movements`. Ya **no actualiza** `inventory.stock_current`. El stock real se descuenta en Sheets vía `syncStockToSheets`.
    - **`app/requests/actions.ts` — Anulación**: Eliminado el bloque que leía/escribía `inventory` durante restauración de stock. Ahora solo restaura en Sheets (`restoreStockInSheets`) y logea en `stock_movements`.
    - **`app/stock/actions.ts` — `addStockEntry`**: Reescrito para llamar a nueva función `addStockInSheets()` que suma stock directamente en Google Sheets. El `inventory` de Supabase solo recibe un upsert silencioso del SKU (cascarón para satisfacer FK de `stock_movements`).
    - **`app/stock/actions.ts` — `processStockExit`**: Reescrito para llamar a nueva función `removeStockInSheets()` que resta stock en Google Sheets. Mismo patrón: upsert silencioso + log de auditoría.
    - **`lib/sheets-mutations.ts`**: Nuevas funciones `addStockInSheets()` y `removeStockInSheets()` con soporte completo de clave compuesta `SKU::Talla`.
    - **Cache**: Se llama `invalidateInventoryCache()` tras cada operación de stock para que la siguiente carga de página muestre datos frescos de Sheets.
- **Tabla `inventory`**: Queda en Supabase como cascarón inerte. No se lee ni se usa para lógica. Solo existe para satisfacer la FK `stock_movements_sku_fkey`.
- **Tabla `stock_movements`**: Se mantiene como log de auditoría funcional.
- **Archivos Modificados**:
    - `src/app/requests/actions.ts`: Reescritura de `deliverRequestRPC`, limpieza de anulación, imports de `invalidateInventoryCache`.
    - `src/app/stock/actions.ts`: Reescritura completa — Sheets primero, Supabase solo como audit log.
    - `src/lib/sheets-mutations.ts`: Nuevas funciones `addStockInSheets` y `removeStockInSheets`.

### [2026-02-18] - Compatibilidad Móvil Completa (Samsung S25 / teléfonos Chile)
- **Objetivo**: Asegurar que todas las funciones de la aplicación sean usables en dispositivos móviles comunes en Chile (Samsung Galaxy S25: 412x915px, iPhone 15, Xiaomi, etc.)
- **Problemas Identificados**:
    1. ❌ **Sin navegación móvil**: El sidebar lateral (`hidden md:flex`) desaparecía en pantallas <768px sin alternativa de navegación.
    2. ❌ **Tabla de solicitudes no responsive**: La tabla HTML de `CreateRequestForm` se desbordaba horizontalmente en 412px.
    3. ❌ **Botones de carrusel invisibles**: Los botones prev/next de imágenes solo aparecían en `group-hover` (inexistente en pantallas táctiles).
    4. ❌ **Lightbox sin soporte touch**: Zoom/pan/navegación basados exclusivamente en mouse.
    5. ❌ **Botón flotante del carrito tapado**: Se superponía con la barra de navegación inferior.
- **Soluciones Implementadas**:
    1. ✅ **MobileNav** (`components/layout/MobileNav.tsx`):
        - Bottom Navigation Bar fija con 5 tabs: Inicio, Inventario, Carrito, Solicitudes, Más.
        - Indicador activo con barra superior azul y escala.
        - Botón "Más" abre un drawer lateral con: perfil, sección admin (si corresponde), toggle de tema, y cerrar sesión.
        - El drawer se cierra al cambiar de ruta.
        - Body scroll bloqueado cuando el drawer está abierto.
        - Soporte `safe-area-inset-bottom` para iPhones con barra home.
    2. ✅ **Tabla responsive** (`CreateRequestForm.tsx`):
        - Clase `mobile-card-table` que transforma filas de tabla en tarjetas apiladas en pantallas <640px.
        - CSS media query en `globals.css` que oculta `thead`, convierte `tbody tr` a `flex-column` con bordes y padding.
    3. ✅ **Botones de carrusel visibles en touch** (`ImageCarousel.tsx`):
        - Botones prev/next siempre visibles en móvil (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).
        - Tamaño incrementado de `w-8 h-8` a `w-9 h-9` para mejor área de toque.
    4. ✅ **Lightbox con soporte touch completo** (`ImageCarousel.tsx`):
        - Swipe horizontal para navegar entre imágenes (threshold: 50px, <400ms).
        - Pinch-to-zoom con tracking de distancia entre dos dedos.
        - Touch-drag para pan cuando la imagen está ampliada.
        - Touch handlers: `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`.
    5. ✅ **Botón del carrito reposicionado** (`CartSidebar.tsx`):
        - De `bottom-6` a `bottom-24 md:bottom-6` — se eleva sobre la barra de navegación en móvil.
    6. ✅ **Layout principal ajustado** (`layout.tsx`):
        - Main content: `pb-20 md:pb-0` para evitar que el contenido quede debajo de la barra inferior.
    7. ✅ **CSS utilities agregados** (`globals.css`):
        - `.safe-area-bottom`: padding para safe area de iPhone.
        - `.mobile-card-table`: transformación de tabla a tarjetas apiladas.
        - `.touch-target`: tamaños mínimos para targets táctiles (44x44px).
- **Archivos Modificados**:
    - `components/layout/MobileNav.tsx` (NUEVO)
    - `app/layout.tsx` (MobileNav integration + padding)
    - `app/globals.css` (safe-area, mobile table, touch targets)
    - `components/requests/CreateRequestForm.tsx` (mobile-card-table class)
    - `components/inventory/ImageCarousel.tsx` (touch handlers + visible buttons)
    - `components/cart/CartSidebar.tsx` (responsive bottom position)
- **Verificación**: Build exitoso (`next build` sin errores). DOM/CSS verificados por JavaScript: bottom nav presente con 5 items, sidebar con `hidden md:flex`, cart button con `bottom-24 md:bottom-6`.
- **Dispositivos Target**: Samsung Galaxy S25 (412x915), iPhone 15 (390x844), Xiaomi Redmi Note (393x851), Samsung A54 (412x915).

### [2026-02-18] - Reorganización del Sidebar: Sub-menú "Administración"
- **Objetivo**: Separar los ítems de navegación general de los ítems exclusivos de administrador en el sidebar lateral.
- **Cambios**:
    - **Grupo "Navegación"** (visible para todos): Inicio, Inventario, Carrito, Mis Solicitudes.
    - **Grupo "Administración"** (solo admins, colapsable): Administrar Solicitudes, Gestión de Stock, Configuración avanzada.
    - "Administración" renombrado a **"Configuración avanzada"** con ícono `Settings` (engranaje).
    - "Gestión de Stock" movido al grupo admin.
    - El sub-menú es colapsable con animación (chevron + max-height transition).
    - Se auto-expande si el usuario está en una ruta de admin.
    - Usuarios no-admin no ven la sección de Administración por defecto.
- **Archivos Modificados**:
    - `src/constants/navigation.ts`: Nuevo campo `group: "navigation" | "admin"` en `MenuItem`. Reorganización del orden. Renombrado de label.
    - `src/components/layout/AppSidebar.tsx`: Separación en dos grupos con rendering independiente, estado `adminMenuOpen`, botón colapsable con `ChevronDown`.

### [2026-02-18] - 🔴 FIX CRÍTICO: Stock no se descontaba para ítems con talla (SKU + Talla)
- **Bug**: Al confirmar entregas de ítems con variantes de talla (ej: "Chaleco geólogo talla XXL"), el stock en Google Sheets **nunca se descontaba**. Solo se actualizaba la última fila del SKU, ignorando las demás tallas.
- **Causa Raíz (3 puntos de fallo)**:
    1. **`sheets-mutations.ts` — inventoryMap**: Usaba solo `sku` como clave del Map. Cuando múltiples filas en ITEMS comparten el mismo SKU (ej: `401-GEOLO-01` con tallas XXL, L, XL), el `forEach` sobreescribía las entradas anteriores. Solo la última fila quedaba registrada.
    2. **`actions.ts` — deliverRequest**: Al llamar `syncStockToSheets()`, mapeaba los ítems con solo `{ sku, quantity }`, **sin pasar la `talla`**. La función no podía discriminar qué fila actualizar.
    3. **Supabase RPC `process_delivery`**: La tabla `inventory` no tiene columna `talla` y el SKU es PK única. Solo existe 1 fila por SKU → imposible distinguir tallas en Supabase. *(Este punto requiere migración futura)*.
- **Corrección aplicada**:
    - **`lib/sheets-mutations.ts`**: `inventoryMap` ahora usa clave compuesta `SKU::Talla`. Ítems con talla se indexan como `401-GEOLO-01::XXL`. Ítems sin talla mantienen solo `SKU`. Fallback a SKU-only si la clave compuesta no se encuentra. Mismo fix para `restoreStockInSheets`.
    - **`app/requests/actions.ts`**: `syncStockToSheets()` y `restoreStockInSheets()` ahora reciben `talla` en el payload: `items.map(i => ({ sku: i.sku, quantity: i.quantity, talla: i.talla }))`. Tipo de items_detail actualizado a incluir `talla?: string`.
- **Pendiente**: Migración de la tabla `inventory` en Supabase para soportar columna `talla` como parte de la PK compuesta, y actualización del RPC `process_delivery`.
- **Archivos Modificados**:
    - `src/lib/sheets-mutations.ts`: Interfaces, inventoryMap key, lookups en sync y restore.
    - `src/app/requests/actions.ts`: Tipo de items_detail, llamadas a sync/restore con talla.

### [2026-02-17] - 🔴 FIX CRÍTICO: Mapeo de Columnas en sheets-mutations.ts (Stock → Link_Foto)
- **Bug**: Al entregar o anular una solicitud, los valores de resta/suma se escribían en la columna **F (Link_Foto)** en vez de la columna **G (Stock_Actual)** en Google Sheets.
- **Causa Raíz**: Cuando se agregó la columna **Talla** en la posición **E**, todas las columnas posteriores se desplazaron 1 posición: Link_Foto pasó de E→F, Stock_Actual de F→G. El archivo `data.ts` fue actualizado correctamente (usa `row[6]` para stock), pero `sheets-mutations.ts` quedó con el mapeo viejo:
    - Leía rango `ITEMS!A2:F` (solo hasta Link_Foto, no alcanzaba Stock_Actual)
    - Leía `row[5]` como stock (era Link_Foto)
    - Escribía en `ITEMS!F${row}` (Link_Foto)
- **Corrección** en `lib/sheets-mutations.ts`:
    - **Rango**: `ITEMS!A2:F` → `ITEMS!A2:G` (ambas funciones: sync y restore)
    - **Lectura**: `row[5]` → `row[6]` para leer Stock_Actual correctamente
    - **Escritura**: `ITEMS!F${rowIndex}` → `ITEMS!G${rowIndex}` para escribir en Stock_Actual
- **Actualización de gemini.md**: Schema de ITEMS actualizado para incluir columna Talla en posición E y reflejar el desplazamiento de todas las columnas posteriores (F=Link_Foto, G=Stock_Actual, H=Stock_Reservado, etc.)
- **Impacto**: Los valores -1 y -8 visibles en la columna Link_Foto de Google Sheets eran restos del stock calculado que se estaba escribiendo en la columna equivocada. El stock real nunca se decrementaba.

### [2026-02-17] - Rediseño Completo del Email de Confirmación de Solicitud
- **Objetivo**: El email HTML de confirmación era básico y poco profesional. Se rediseñó completamente con un layout premium.
- **Cambios Visuales**:
    - **Header**: Badge "Gestión de Pañol" + título más grande + línea decorativa degradada azul→púrpura.
    - **Código de seguimiento**: Ahora en un box con borde sutil y fondo semi-transparente.
    - **Información del solicitante**: Email en azul, área en badge verde, emojis como iconos para cada sección.
    - **Valor estimado**: Se muestra el total estimado en CLP si los items tienen valor.
    - **Tarjetas de items**: Cada item ahora es una tarjeta con:
        - **Imagen del componente** a la izquierda (72x72px con borde redondeado).
        - Si no hay imagen: placeholder con emoji de caja.
        - SKU en azul monospace, nombre en bold, badges de Marca (celeste) y Talla (púrpura).
        - Notas del item en itálica.
        - Cantidad en un box azul claro con unidades.
        - Precio unitario y subtotal en verde.
    - **Total de solicitud**: Box verde con total estimado en monospace.
    - **Notas generales**: Box amarillo con borde izquierdo naranja.
    - **Status y fecha**: Badge "Pendiente de revisión" con degradado + fecha con emoji.
    - **Footer**: Línea decorativa + copyright.
- **Formato de Fecha**: Cambiado de 12 horas (AM/PM) a **24 horas** + " hrs" (ej: "martes, 17 de febrero de 2026, 14:38 hrs").
- **URLs de imágenes en email**: Nueva función `toPublicImageUrl()` convierte URLs del proxy local (`/api/image-proxy?id=X`) a URLs públicas de Google (`https://lh3.googleusercontent.com/d/X=w200`) para que las imágenes sean visibles en el correo.
- **Archivos Modificados**:
    - `src/app/requests/actions.ts`: Rediseño completo del template HTML + nueva función `toPublicImageUrl()` + formato de fecha 24h.

### [2026-02-17] - Configuración Dinámica de Webhook N8N (Test / Producción)
- **Objetivo**: Permitir al administrador alternar entre el webhook de **producción** y el de **test** de N8N desde la interfaz, sin tocar código.
- **Cambios en Supabase**:
    - Nueva tabla `app_settings` (key/value) con RLS habilitado.
    - Policy: lectura para todos los autenticados, escritura solo para Administradores.
    - Datos iniciales: `webhook_mode` = `production`, `webhook_url_production`, `webhook_url_test`.
- **Cambios en Archivos**:
    - `src/app/admin/webhook-actions.ts` (**Nuevo**):
        - `getWebhookConfig()`: Lee la configuración actual desde `app_settings`.
        - `updateWebhookMode()`: Cambia el modo (con validación de rol admin).
        - `getActiveWebhookUrl()`: Retorna la URL activa según el modo configurado.
    - `src/app/admin/WebhookConfigPanel.tsx` (**Nuevo**):
        - Panel visual con dos opciones (Producción / Test) estilo radio cards.
        - Badge de estado (🟢 PRODUCCIÓN / 🟡 TEST) con animación pulse.
        - Muestra la URL activa en `<code>` seleccionable.
        - Warning amarillo cuando el modo Test está activo.
        - Feedback visual de éxito/error con auto-dismiss.
    - `src/app/admin/page.tsx`:
        - Import y renderizado del `WebhookConfigPanel` entre stats y permisos.
        - Fetch paralelo con `Promise.all()` para cargar configs sin penalización de latencia.
    - `src/app/requests/actions.ts`:
        - Eliminada constante hardcodeada `PURCHASE_WEBHOOK_URL`.
        - `sendPurchaseWebhook()` ahora recibe URL como parámetro.
        - `createRequest()` y `simulatePurchaseWebhook()` llaman a `getActiveWebhookUrl()` antes de enviar.
- **URLs**:
    - Producción: `https://n8n-n8n.mfwm9e.easypanel.host/webhook/d92604e6-c697-42d3-9e42-d6528d9c5334`
    - Test: `https://n8n-n8n.mfwm9e.easypanel.host/webhook-test/d92604e6-c697-42d3-9e42-d6528d9c5334`
- **Verificado**: Panel funcional, toggle entre modos actualiza Supabase y se refleja en tiempo real en la UI.

### [2026-02-17] - Fix Badge de Tallas Detrás de Imagen
- **Problema**: En la vista deck del inventario, el badge morado que indica la cantidad de tallas (ej: "3 tallas") aparecía **detrás** de la imagen del producto, haciéndolo ilegible.
- **Causa Raíz**: El badge tenía `z-10` mientras los elementos internos del `ImageCarousel` (imagen, counter, botones) usaban `z-10` y `z-20`, creando un stacking context que lo tapaba.
- **Solución**: Se cambió el `z-index` del contenedor del badge de `z-10` a `z-20` en `app/inventory/page.tsx` (línea 318).
- **Archivos Modificados**:
    - `src/app/inventory/page.tsx`: `z-10` → `z-20` en el div del badge de tallas.

### [2026-02-17] - Lightbox Modal para Imágenes del Inventario
- **Funcionalidad**: Al hacer clic en la imagen de cualquier producto del inventario, se abre un visor a pantalla completa (lightbox).
- **Características**:
    - Imagen en tamaño grande sobre fondo oscuro con efecto blur.
    - Navegación entre fotos del mismo producto con flechas laterales.
    - Strip de miniaturas (thumbnails) en la parte inferior para salto directo.
    - Contador de foto actual (ej: "1 / 2").
    - Nombre del producto visible en la barra superior.
    - **Cerrar con**: botón X, clic en zonas oscuras/backdrop, o tecla **ESC**.
    - Navegación con teclado: **← →** para cambiar foto.
    - **Zoom con scroll del mouse**: Rueda arriba/abajo (rango 1x–5x). Badge "138%" visible.
    - **Zoom con clic**: Clic en la imagen alterna entre 1x y 2x. Cursor `zoom-in`.
    - **Pan/arrastre**: Cuando hay zoom, se puede arrastrar la imagen para explorarla.
    - Teclado: **+/-** para zoom, **0** para resetear zoom.
    - Animaciones de apertura/cierre (fade + scale).
    - Cursor `zoom-in` e ícono de lupa al hacer hover sobre las imágenes en las tarjetas.
    - Portal rendering (React `createPortal`) para evitar problemas de z-index.
    - El contenedor de imagen usa `pointer-events-none` para que los clics en zonas oscuras pasen al backdrop.
- **Cambios en Archivos**:
    - `components/inventory/ImageCarousel.tsx`:
        - Nuevo componente interno `ImageLightbox` con zoom, pan, navegación y cierre.
        - Estado: `zoom`, `pan`, `isDragging`, `wasDragged` (ref para diferenciar drag vs click).
        - `imageContainerRef` con `pointer-events-none` + `img` con `pointer-events-auto`.
        - Backdrop div tiene `onClick={handleClose}` con `z-[1]` y cursor pointer.
        - `useEffect` para scroll wheel zoom (event listener con `passive: false`).
        - Zoom resets al cambiar de imagen.
- **Verificado**: Screenshots confirman: apertura del visor, cierre al clic en zona oscura, zoom con scroll (badge 138%), y navegación correcta.

### [2026-02-17] - Proxy de Imágenes Server-side
- **Problema**: Las imágenes de Google Drive no cargaban consistentemente. Google devolvía HTTP 429 (Too Many Requests) cuando el browser hacía muchas peticiones simultáneas a `lh3.googleusercontent.com`.
- **Diagnóstico**: Mediante inspección JS del DOM, se confirmó que `naturalWidth === 0` en las imágenes fallidas, y los logs de consola mostraban errores 429.
- **Solución**: Crear un API Route proxy (`/api/image-proxy?id={fileId}`) que:
    1. Recibe el Google Drive file ID como parámetro.
    2. Descarga la imagen server-side (evita rate-limiting del browser).
    3. Cachea en memoria (30 min TTL, máx 200 imágenes).
    4. Sirve con `Cache-Control: public, max-age=86400` (1 día de caché en browser).
    5. Fallback automático: si la URL `lh3` falla, intenta `drive.google.com/thumbnail`.
- **Cambios en Archivos**:
    - `app/api/image-proxy/route.ts` (**Nuevo**):
        - Proxy server-side con caché en memoria y headers de caché agresivos.
        - Validación de file ID con regex `[a-zA-Z0-9_-]+`.
        - Timeout de 10 segundos por petición a Google.
        - `X-Image-Cache: HIT/MISS` header para debugging.
    - `lib/data.ts`:
        - URL de imagen cambiada de `https://lh3.googleusercontent.com/d/{ID}=w1000` a `/api/image-proxy?id={ID}`.
        - Nueva función `convertToProxyUrl()`: convierte cualquier URL de Google Drive a proxy URL (soporta lh3, drive.google.com/file/d/, drive.google.com/uc?id=). URLs no-Google pasan sin cambios.
        - `linkFoto` fallback también pasa por `convertToProxyUrl()`.
- **Resultado**: ✅ TODAS las imágenes ahora cargan correctamente. Verificado visualmente: Cotona café, Cotona gris, Gorros polares — todos cargando fotos.

### [2026-02-17] - Caché en Memoria + Botón Admin "Actualizar Datos"
- **Problema**: Las imágenes y datos del inventario se recargaban lentamente porque cada visita a la página hacía 2 llamadas a Google Sheets (inventario + imágenes), sin caché. El cruce SKU→imágenes se repetía en cada render.
- **Solución**: Sistema de caché server-side en memoria con TTL de 5 minutos + botón admin para forzar invalidación.
- **Cambios en Archivos**:
    - `lib/data.ts`:
        - Nuevo sistema de caché en memoria con `CacheEntry<T>` (TTL: 5 min).
        - `getImageLinksMap()` ahora cachea el `Map<SKU, URL[]>` tras el primer fetch.
        - `getInventory()` cachea la lista completa de items; queries se filtran desde el caché.
        - Nueva función exportada `invalidateInventoryCache()` para borrar ambos cachés.
        - Nueva función exportada `getCacheStatus()` para consultar estado del caché.
    - `app/api/revalidate-inventory/route.ts` (**Nuevo**):
        - `POST`: Solo admins (verifica `isCurrentUserAdmin()`). Invalida caché + `revalidatePath()`.
        - `GET`: Retorna estado del caché (público, read-only).
    - `components/inventory/InventoryActionToolbar.tsx`:
        - Nueva prop `isAdmin?: boolean`.
        - Botón **"Actualizar Datos"** (ícono `RefreshCw`, estilo amber) visible solo para admins.
        - Estados visuales: idle → loading (spinner) → success (verde ✓) → idle (3s auto-reset).
        - Cooldown de 10 segundos entre actualizaciones para prevenir spam.
        - `router.refresh()` tras éxito para recargar la página con datos frescos.
    - `app/inventory/page.tsx`:
        - Import `getUserProfile` y fetch en paralelo con inventario.
        - Pasa `isAdmin` al `InventoryActionToolbar`.
- **Resultado**: Primera carga consulta Google Sheets; cargas subsiguientes (dentro de 5 min) sirven datos desde caché (~instantáneo). Admin puede forzar actualización con un clic.
- **Verificado**: Botón visible en toolbar, funcional con feedback visual. Logs del servidor confirman `[Cache] Using cached inventory data`.

### [2026-02-17] - Limitación de Cantidad por Stock Disponible
- **Objetivo**: Impedir que el usuario solicite más unidades de las que existen en stock.
- **Cambios en Archivos**:
    - `components/inventory/InventoryCardActions.tsx`:
        - Nueva prop `stock` para items sin variantes o con 1 sola talla.
        - Lógica `maxQuantity = stock disponible − cantidad ya en carrito`.
        - Botón `+` se desactiva y se vuelve gris al alcanzar el máximo.
        - Selector de cantidad cambia a **color ámbar** al llegar al tope.
        - Mensaje de advertencia: `⚠ Máx. disponible: N (Talla)`.
        - Items sin stock: selector muestra **0 en rojo**, botón "Sin stock" desactivado, mensaje `⚠ Sin stock disponible`.
        - Tallas sin stock muestran texto tachado (line-through) en los chips.
        - La cantidad se resetea a 1 al cambiar de talla.
        - Validación final en `handleAdd()` como safety check.
    - `app/inventory/page.tsx`:
        - Se pasa la prop `stock` a `InventoryCardActions`:
            - Items con 1 talla → `variants[0].stock`
            - Items sin talla → `totalStock`
            - Items multi-talla → `undefined` (manejado internamente via `variants`)
- **Resultado**: Talla XL con stock 3 → selector se detiene en 3, muestra "Máx. disponible: 3 (XL)" en ámbar.
- **Verificado**: Screenshots confirman limitación funcional y feedback visual correcto.

### [2026-02-17] - Cambio de Agrupación: SKU → Nombre+Marca+Categoría
- **Problema**: Ítems con distinto nombre pero el mismo SKU (ej: "Pantalón térmico" y "Pantalón térmico (Usado)", ambos `401-PANTT-01`) se fusionaban en una sola tarjeta. Esto ocurría porque la columna SKU del Google Sheet es en realidad un código de referencia de imagen, no un identificador único por producto.
- **Solución**: Agrupar ítems por la combinación **Nombre + Marca + Categoría** en vez de por SKU. La columna SKU se mantiene sin cambios.
- **Cambios en Archivos**:
    - `lib/data.ts`:
        - Función renombrada: `groupItemsBySku()` → `groupItemsByIdentity()`.
        - Clave de agrupación: `${nombre.trim()}|${marca.trim()}|${categoría.trim()}`.
        - Las fotos de todos los ítems del grupo se mergean (deduplicadas via `Set`).
        - Se mantiene el merge de variantes de talla duplicadas.
    - `app/inventory/page.tsx`:
        - Actualizado import y llamada a `groupItemsByIdentity()`.
        - React key actualizada de `${item.sku}-${index}` a `${item.nombre}-${item.marca}-${item.categoria}-${index}`.
        - Comentario actualizado para reflejar nueva lógica.
- **Resultado**: Categoría "Ropa" ahora muestra **3 tarjetas** separadas (antes eran 2):
    - "Pantalón térmico" (SKU: 401-PANTT-01)
    - "Pantalón térmico (Usado)" (SKU: 401-PANTT-01)
    - "Parka térmica (Usada)" (SKU: 401-PARKT-01)
- **Verificado**: Screenshot confirma 3 tarjetas con sus tallas, sin errores.

### [2026-02-17] - Fix 6 Errores de Keys Duplicadas
- **Bug**: 6 errores en consola: "Encountered two children with the same key, 'L'."
- **Causa raíz**: Filas duplicadas en Google Sheets con el mismo SKU y la misma talla generaban variantes duplicadas en `groupItemsBySku()`. `InventoryCardActions` usaba `key={v.talla}`, causando colisión.
- **Cambios**:
    - `lib/data.ts`: `groupItemsBySku()` ahora fusiona variantes con la misma talla (suma stock, max ROP) en vez de crear duplicados.
    - `InventoryCardActions.tsx`: Las keys de chips de talla ahora usan `${v.talla}-${i}` como medida defensiva.
- **Resultado**: 0 errores de keys duplicadas.

### [2026-02-17] - Fix 27 Errores de Hidratación (Hydration Mismatch)
- **Bug**: 27 errores de hidratación en consola: "Hydration failed because the server rendered HTML didn't match the client."
- **Causa raíz**: `CartProvider` en `cart-context.tsx` inicializaba el estado `items` directamente desde `localStorage` dentro de `useState()`. En el servidor, `localStorage` no existe → estado vacío `[]`. En el cliente, `localStorage` podía tener items guardados → estado diferente. Este **único mismatch se propagaba como cascada** a todos los ~27 descendientes del layout.
- **Causa secundaria**: `NotificationBell` creaba `createClient()` en cada render (fuera de useRef), causando que el `useEffect` de realtime se re-suscribiera infinitamente y generara un leak de suscripciones.
- **Cambios en Archivos**:
    - `context/cart-context.tsx`:
        - `useState<CartItem[]>([])` siempre inicia vacío (servidor = cliente).
        - Nuevo `useEffect([], [])` carga `localStorage` solo después del mount.
        - `useRef(isInitialLoad)` previene que el `useEffect` de guardado sobreescriba `localStorage` con `[]` antes de leer.
        - Nuevo campo `hasMounted: boolean` en el contexto para que consumidores sepan cuándo es seguro renderizar contenido client-only.
    - `components/cart/CartSidebar.tsx`:
        - El badge de `totalItems` en el botón flotante ahora usa `hasMounted && totalItems > 0` para evitar renderizar el `<span>` antes de la hidratación.
    - `components/dashboard/NotificationBell.tsx`:
        - `createClient()` movido a `useRef` (se crea una sola vez, no en cada render).
        - `isOpen` movido a `useRef` para que el callback de realtime lea el valor actual sin necesidad de incluirlo en las dependencias del `useEffect`.
        - `fetchNotifications` movido antes del `useEffect` que lo usa.
        - Eliminada función `fetchNotifications` duplicada.
- **Resultado**: 0 errores de hidratación. Página carga limpia en `/requests/pending` y todas las rutas.
- **Verificado**: Captura de pantalla confirma ausencia de overlay de error y badge "N Issues" de Next.js.

### [2026-02-16] - Agrupación de Ítems por Talla con Selector de Stock
- **Objetivo**: Fusionar ítems que comparten el mismo SKU pero tienen distintas tallas en una sola tarjeta, mostrando stock total/individual.
- **Cambios en Archivos**:
    - `lib/data.ts`:
        - Nueva interfaz `SizeVariant` (talla, stock, reservado, rop).
        - Nueva interfaz `GroupedInventoryItem` (totalStock, totalReservado, maxRop, variants[], hasSizes).
        - Nueva función `groupItemsBySku()` que agrupa ítems por SKU y mergea variantes de talla.
    - `components/inventory/SizeStockSelector.tsx` (**Nuevo**):
        - Componente cliente interactivo con chips de selección: "Todas" + tallas individuales.
        - Al seleccionar "Todas": muestra "Stock Total" sumado.
        - Al seleccionar talla específica: muestra "Stock {talla}" con cantidad individual.
        - Mini breakdown visual cuando "Todas" está seleccionado (tags por talla con stock).
        - Colores adaptativos: rojo para stock crítico, verde esmeralda para stock OK, púrpura para badges de talla.
    - `app/inventory/page.tsx`:
        - Deck view: usa `groupedItems` (agrupados) → una tarjeta por SKU con selector de tallas.
        - Badge "N tallas" en esquina superior izquierda de la imagen (púrpura).
        - Ítems sin talla mantienen el grid stock/ROP estándar sin cambios.
        - List view: se agregó columna "Talla" entre Marca y Stock (vista individual no agrupada).
        - Contador de items refleja la cantidad agrupada en deck view.
- **Lógica**:
    - Si un ítem tiene talla pero es único (no hay variantes), muestra la talla como badge estático.
    - Si un ítem tiene múltiples variantes, muestra el `SizeStockSelector` completo.
    - Si un ítem no tiene talla, se muestra normalmente (sin fila de talla).
- **Verificado**: Parka térmica (Usada) con tallas XL y XXL ahora aparece como 1 tarjeta con stock total 97 y selector interactivo.

### [2026-02-16] - Integración Carrusel de Imágenes desde Google Drive
- **Objetivo**: Mostrar múltiples fotos por ítem de inventario usando un carrusel interactivo, alimentado desde la hoja "Link imágenes" de Google Sheets.
- **Datos**:
    - Se conectó a la hoja `Link imágenes` (ID: `1Ic7x6ikmKr9UPej_RstOdGCv7v0Mc1V1UK3lyF7Ec6w`) para obtener los enlaces de imágenes.
    - Patrón de nombre de archivo: `{SKU}-{NúmeroFoto}.{ext}` (ej: `401-PARKT-01-01.png` → SKU `401-PARKT-01`).
    - URLs de imagen: `https://lh3.googleusercontent.com/d/{FILE_ID}=w1000`.
- **Cambios en Archivos**:
    - `.env.local`: Se agregó `LINK_IMAGENES_SPREADSHEET_ID`.
    - `lib/data.ts`:
        - Se añadió `fotos: string[]` a la interfaz `InventoryItem` (manteniendo `foto: string` para compatibilidad).
        - Nueva función `getImageLinksMap()` que lee la hoja "Link imágenes" y devuelve un `Map<SKU, string[]>`.
        - Se modificó `getInventory()` para hacer fetch en paralelo (inventario + imágenes) y mergear por SKU.
    - `components/inventory/ImageCarousel.tsx` (**Nuevo**):
        - Componente cliente con flechas prev/next (visibles en hover), indicadores de puntos, contador "1/2", spinner de carga y fallback a ícono Package.
    - `app/inventory/page.tsx`:
        - Vista Deck: Reemplazó imagen estática por `<ImageCarousel fotos={item.fotos}>`.
        - Vista Lista: Thumbnail usa `fotos[0]`.
        - `InventoryCardActions` recibe `fotos[0]` como imagen.
- **Lógica de Prioridad de Imágenes**:
    1. Imágenes de "Link imágenes" (carrusel completo)
    2. Fallback a `Link_Foto` de Pañol_DB (imagen única)
    3. Ícono Package por defecto
- **Bug Fix**: Se cambió de Next.js `<Image>` a `<img>` nativo para las URLs de Google Drive — el componente Image de Next.js reportaba `naturalWidth: 0` a pesar de cargar correctamente.
- **Verificado**: Carrusel funcional con navegación, contador, puntos y carga de imágenes desde Google Drive.

### [2026-02-16] - Fix Botón "Anular" en Historial Administrativo
- **Bug Fix**: El botón "Anular" en el Historial Administrativo no desaparecía tras usarlo, permitiendo clics duplicados que fallaban.
- **Causa raíz**: El botón se mostraba basándose en el estado del log (`new_status`), no en el estado actual de la solicitud. Además, la query de movimientos no incluía `'Cancelada'`, haciendo las anulaciones invisibles.
- **Cambios**:
    - `actions.ts`: Se agregó `'Cancelada'` al filtro y se enriquecieron los movimientos con `current_request_status` del request asociado.
    - `AdminMovementHistoryTable.tsx`: El botón "Anular" ahora solo aparece si la solicitud sigue en estado `'Entregada'`. Se agregó tracking optimistic UI y nueva pestaña "Canceladas".


### [2026-02-16] - Análisis de Repositorio e Instalación de Skills
- **Análisis Completo**: Exploración exhaustiva del repositorio, stack tecnológico, módulos, componentes e integraciones.
- **Skills Creadas** (3 nuevas en `Desktop/Skills/`):
    - `experto-nextjs-supabase` — Patrones Next.js 16 + Supabase SSR/Auth/Realtime
    - `experto-tailwindcss-ui` — TailwindCSS 4 + Framer Motion + sistema de temas dark/light
    - `gestion-panol-etapa` — Dominio del negocio Pañol + protocolo E.T.A.P.A.
- **Archivos E.T.A.P.A. Actualizados**: `findings.md` renovado con stack completo, módulos, integraciones y restricciones actualizadas.

### [Fecha Anterior - Cierre de Sesión] - Pulido Visual y UX Completo
- **Navegación y Estructura**:
    - **Reordenamiento del Menú**: "Inventario" ahora tiene prioridad sobre "Gestión de Stock".
    - **Renombrado**: "Nueva Solicitud" pasa a llamarse **"Carrito"**.
    - **Selector de Tema**: Se trasladó el toggle (Día/Noche) al menú de navegación lateral.
- **Página de Perfil**:
    - **Corrección de Estilos**: Ajuste integral de colores de fondo, texto e inputs para garantizar legibilidad perfecta en modos Claro y Oscuro.
- **Inventario y Filtros**:
    - **Multi-Selección**: Se habilitó la capacidad de seleccionar múltiples opciones en los filtros (Categoría, Marca, Ubicación, etc.).
    - **Ordenamiento Avanzado**: Nuevo botón de ordenamiento con opciones claras (A-Z, Precio, Marca) e indicadores visuales de dirección.
    - **Layout**: Reubicación del toggle Vista Lista/Tabla para mejor ergonomía.
- **Gestión de Pedidos (Mis Solicitudes)**:
    - **Detalle de Pedido Renovado**: Inclusión de precios unitarios, cálculo de valor total y enlaces para **re-ordenar ítems** directamente desde el detalle.
    - **Flujo de Cancelación**: Corrección de bugs en la confirmación visual y lógica de cancelación de pedidos.
    - **Navegación**: Ajuste de textos en botones de retorno ("Volver a Mis Solicitudes").
- **Componentes y Visualización**:
    - **DatePickers Modernos**: Implementación global del componente `ModernDatePicker` (estilo iOS) reemplazando inputs nativos.
    - **Gráficos**: Ajuste del Gráfico de Tendencias para consumir datos reales y eliminación de KPIs sin uso ("Tiempo de atención").
    - **UI General (Dark/Clear Mode)**: Múltiples correcciones de bordes, fondos y contrastes en contenedores específicos que presentaban problemas en cambios de tema.


### [Fecha Actual] - Mejoras en Dashboard y Notificaciones
- **Fix "Sin Conexión en Vivo"**: Se implementó un mecanismo de *fallback* (respaldo) en `DashboardRealtimeSync`. Ahora, si la conexión Realtime falla (común por falta de permisos de replicación), el sistema cambia automáticamente a modo "Polling" (Sincronización Automática cada 30s), asegurando que el dashboard nunca quede "desconectado".
- **Notificaciones para Administradores**:
    - Se creó el componente `NotificationBell.tsx`.
    - **Fix UI Inventario**: Se corrigió el problema de superposición del menú desplegable "Ordenar por" sobre la grilla de productos, ajustando el `z-index` del contenedor de la barra de herramientas.
    - **Fix Color Barra Inventario**: Se ajustó el color de fondo de la barra de herramientas en modo claro ("plomo" a blanco/limpio) para mejorar la estética profesional, manteniendo la compatibilidad con el modo oscuro.
    - Ahora los administradores reciben un Toast de notificación ("Nueva Solicitud") instantáneo cuando ingresa un pedido.
    - La campana muestra un punto rojo pulsante si hay solicitudes pendientes.
    - El contador se actualiza en tiempo real o mediante polling.
    - Se agregó in ícono de lupa (Search) a la tarjeta de "Items con Stock Crítico" para mejorar la indicación de interactividad.
    - **Gestión de Stock**:
        - Se agregó botón "Volver" en la cabecera.
        - Se corrigió indicador de estado "Sin conexión" (ahora verifica conexión a internet del navegador).
        - Se habilitó enlace directo al ítem (SKU) desde el historial de movimientos.
    - **Filtros de Inventario**:
        - Se implementó un botón de "Personalizar Filtros" (ícono de ajustes).
        - **Gestor de Visibilidad**: Permite al usuario elegir qué filtros mostrar u ocultar en la barra principal.
        - **Nuevos Filtros**: Se añadió soporte para filtrar por **Clasificación** (Crítico/No Crítico) y **Nivel** (Estante Nivel), extrayendo los valores dinámicamente de los datos.
        - **UI Fix (Modo Claro)**: Se corrigió la visualización de los filtros desplegables (`FilterCombobox`) y el gestor de visibilidad (`FilterVisibilityManager`). Anteriormente usaban estilos oscuros forzados, ahora se adaptan correctamente al tema claro (blanco/gris claro) y oscuro (slate), mejorando significativamente la legibilidad.

### [Fecha Anterior] - Integración de Gestión de Stock
- **Módulo de Stock**: Implementado sistema dual (Entrada/Salida).
- **Entrada**: Escáner simulado o selección manual para reponer stock.
- **Salida**: Retiro de ítems con registro de motivo/OT.
- **Dashboard**: Se agregaron accesos directos a estas funciones.

### [Fecha Anterior] - Refinamiento de Solicitudes
- **Filtros**: Se refinó la lista de pendientes (solo Pendiente/Aceptada/Alerta).
- **Historial Admin**: Nueva vista para entregadas/eliminadas.
- **Anular**: Funcionalidad para revertir entregas.

## Tareas Pendientes Inmediatas
- [x] Integrar carrusel de imágenes desde "Link imágenes" en inventario.
- [x] Verificar si el usuario ha habilitado la Replicación en Supabase (para activar el modo Realtime nativo).
- [x] Pulir estilos de notificaciones.
- [~] Continuar con la Fase 3 (Integración Apps Script no aplica — conexión directa a Sheets es suficiente).

## Notas Técnicas
- **Realtime vs Polling**: El sistema prefiere Realtime (WebSockets), pero degrada elegantemente a Polling (HTTP requests periódicos) para garantizar funcionalidad.
- **Permisos**: La tabla `material_requests` debe tener "Replication" activada en Supabase para que el modo Realtime funcione al 100%.

- Actualizaci�n de variables de entorno en Vercel y re-despliegue.

## 2026-02-21: Fotografías en QR Scanner + Botón Ver Detalle en Inventario
### Cambios realizados:
1. **Fotos de productos en resultado del escáner QR** (src/app/requests/actions.ts + src/components/scan/QRScannerClient.tsx):
   - Se agregó el campo `foto` al enriquecimiento de ítems en `lookupRequestByCode()`
   - Se actualizó el tipo `EnrichedItem` para incluir `foto: string | null`
   - Cada ítem ahora muestra su fotografía (thumbnail 56x56px) junto a los detalles
   - Si no hay foto disponible, se muestra un ícono de Package como fallback
   - Se agregó enlace "Ver en inventario" (abre nueva pestaña filtrada por SKU)

2. **Botón "Ver detalle" en Inventario** (src/app/inventory/page.tsx):
   - Se agregó botón "Ver detalle" con ícono ExternalLink en cada tarjeta del deck view
   - Abre la página de inventario filtrada por el SKU del artículo en una nueva pestaña
   - Diseño consistente con el estilo existente (blue-500 theme)

### Estado:  Completado


