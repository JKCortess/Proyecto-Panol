# Módulo de Gestión de Stock (Stock Management)

## Descripción
Módulo para administrar las entradas (recepción de compras) y salidas (entregas directas/rápidas) de inventario, permitiendo mantener el stock físico sincronizado con el sistema. Reemplaza al antiguo módulo "Fast Scan".

## Ubicación
- Ruta: `/stock`
- Acceso: `Administrador` (controlado por `role_permissions`)
- Componente Principal: `components/stock/StockManager.tsx`

## Funcionalidades

### 1. Entrada de Stock (Inbound)
Permite ingresar mercancía al pañol.
- **Búsqueda:** Autocompletado por SKU o Nombre.
- **Carrito de Ingreso:** Permite agregar múltiples ítems en una sola transacción.
- **Datos:** Cantidad, Notas globales.
- **Efecto:** Aumenta `stock_current` en tabla `inventory`.
- **Registro:** Crea registro tipo `Entrada` en `stock_movements`.

### 2. Salida de Stock (Outbound)
Permite registrar salidas rápidas o regularizaciones de inventario.
- **Caso de uso:** Entrega de materiales que no pasaron por el flujo de solicitud web (ej: urgencias, retiro en mesón).
- **Datos Requeridos:**
  - Fecha de salida (puede ser retroactiva).
  - Destinatario (Nombre).
  - Área del destinatario.
  - Motivo / Orden de Trabajo.
- **Efecto:** Disminuye `stock_current` en tabla `inventory`.
- **Registro:** Crea registro tipo `Salida` en `stock_movements` con detalle del destinatario en `notes`.

### 3. Historial
Visualización de los últimos movimientos para auditoría rápida.

## Tablas Afectadas
- `inventory`: Actualización de stock.
- `stock_movements`: Log inmutable de transacciones.

## Seguridad
- Validado en Server Action (`actions.ts`).
- Solo usuarios con rol `Administrador` pueden ejecutar estas acciones.
