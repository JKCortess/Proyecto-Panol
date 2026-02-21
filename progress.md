# Progress Log — Proyecto Pañol (Gestión de Pañol — Dole Molina)

## Estado Actual
- **Fase**: 2 (Web App Premium)
- **Progreso**: ~87%
- **Última Actualización**: Escáner QR para administradores — escaneo de cámara + ingreso manual, vista de detalle con stock/ubicación, entrega rápida.

## Log de Cambios (Reciente)

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
- [ ] Verificar si el usuario ha habilitado la Replicación en Supabase (para activar el modo Realtime nativo).
- [ ] Pulir estilos de notificaciones.
- [ ] Continuar con la Fase 3 (Integración Apps Script no prioritaria por ahora, foco en Supabase).

## Notas Técnicas
- **Realtime vs Polling**: El sistema prefiere Realtime (WebSockets), pero degrada elegantemente a Polling (HTTP requests periódicos) para garantizar funcionalidad.
- **Permisos**: La tabla `material_requests` debe tener "Replication" activada en Supabase para que el modo Realtime funcione al 100%.
