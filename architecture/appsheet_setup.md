# SOP — Configuración de AppSheet (Fase 2)

## 1. Crear la App
1. Abrir el Google Sheet `Pañol_DB`.
2. Ir al menú **Extensiones > AppSheet > Crear una aplicación**.
3. Iniciar sesión con tu cuenta de Google (la misma del Sheet).
4. AppSheet detectará automáticamente la hoja `ITEMS`.

## 2. Configurar Tablas (Data)

### Tabla: ITEMS
- **SKU**: Key, Label, Scannable (marcar "Search" y "Scan").
- **Link_Foto**: Type `Image`.
- **Stock_Actual**: Type `Number`.
- **Stock_Reservado**: Type `Number`.
- **Ubicacion**: Type `Text`.

### Agregar Tablas Restantes
1. Ir a **Data > Tables > New Table "from Sheets"**.
2. Agregar: `MOVIMIENTOS`, `PEDIDOS`, `PEDIDOS_ITEMS`, `USUARIOS`.

### Tabla: MOVIMIENTOS
- **ID_Transaccion**: Key (Initial Value: `UNIQUEID()`).
- **Fecha**: Type `DateTime` (Initial Value: `NOW()`).
- **SKU**: Ref → Source Table: `ITEMS`.
- **Tipo**: Enum (`Entrada`, `Salida`, `Reserva`).

### Tabla: PEDIDOS
- **ID_Pedido**: Key (Initial Value: `UNIQUEID()`).
- **Solicitante_ID**: Ref → Source Table: `USUARIOS`.
- **Estado**: Enum (`Pendiente`, `Reservado`, `Listo`, `Entregado`).

## 3. Crear Vistas (UX)

### Vista 1: Catálogo (Catalog)
- **View type**: Deck o Gallery.
- **For this data**: `ITEMS`.
- **Image**: `Link_Foto`.
- **Primary Header**: `Nombre`.
- **Secondary Header**: `Stock_Actual` & " unidades".
- **Actions**: Add (desactivar si solo es lectura para técnicos).

### Vista 2: Escanear (Scan)
- Configurar un **Form View** para `MOVIMIENTOS`.
- **Column order**: SKU, Tipo, Cantidad.
- El campo SKU abrirá la cámara automáticamente si está marcado como "Scannable".

### Vista 3: Mis Pedidos (Orders)
- **View type**: Card.
- **For this data**: `PEDIDOS`.
- **Group by**: `Estado`.

## 4. Configurar Seguridad (Security)
- Ir a **Security > Require Sign-In**: YES.
- Ir a **Users**: Agregar los emails de prueba (incluyendo `daniel.rojas@dole.com`).
