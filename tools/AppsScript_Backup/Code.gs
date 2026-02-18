/**
 * 🔧 SISTEMA PAÑOL - SMART-MRO
 * Lógica de Negocio y Automatización
 * 
 * Módulos:
 * 1. Alertas de Stock Bajo
 * 2. Workflow de Pedidos (Solicitud -> Preparación -> QR -> Entrega)
 * 3. Gestión de Tokens y Expiración
 */

// ─── CONFIGURACIÓN ──────────────────────────────────────────
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const HOJA_ITEMS = "ITEMS";
const HOJA_PEDIDOS = "PEDIDOS";
const HOJA_PEDIDOS_ITEMS = "PEDIDOS_ITEMS";
const HOJA_MOVIMIENTOS = "MOVIMIENTOS";
const EMAIL_ADMIN = "admin@panol.com"; // CAMBIAR POR EMAIL REAL

// ─── TRIGGERS ───────────────────────────────────────────────

/**
 * Trigger: Se ejecuta al editar una celda.
 * Detecta cambios en Stock_Actual manuales y verifica alertas.
 */
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  
  // Si se edita Stock_Actual en ITEMS (Columna D = 4)
  if (sheet.getName() === HOJA_ITEMS && range.getColumn() === 4) {
    const row = range.getRow();
    if (row > 1) { // Ignorar header
      verificarStockBajo(row);
    }
  }
}

/**
 * Trigger: Time-driven (cada 6 horas).
 * Busca pedidos listos que hayan expirado.
 */
function limpiarPedidosExpirados() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_PEDIDOS);
  const data = sheet.getDataRange().getValues();
  const ahora = new Date();
  
  // Empezar desde fila 2 (índice 1)
  for (let i = 1; i < data.length; i++) {
    const estado = data[i][4]; // Col E: Estado
    const expiracion = new Date(data[i][11]); // Col L: Token_Expiracion
    
    if (estado === "Listo" && expiracion < ahora) {
      const pedidoId = data[i][0];
      Logger.log(`Pedido expirado: ${pedidoId}`);
      
      // Cambiar estado a Expirado
      sheet.getRange(i + 1, 5).setValue("Expirado");
      
      // Liberar stock reservado
      liberarStockReservado(pedidoId);
      
      // Notificar (opcional)
    }
  }
}

// ─── WORKFLOW DE PEDIDOS ────────────────────────────────────

/**
 * Crea un nuevo pedido en estado 'Pendiente'.
 * Llamada desde AppSheet o Formulario.
 */
function crearPedido(solicitanteId, ot, items, notas) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetP = ss.getSheetByName(HOJA_PEDIDOS);
    const sheetPI = ss.getSheetByName(HOJA_PEDIDOS_ITEMS);
    
    const pedidoId = Utilities.getUuid();
    const ahora = new Date();
    
    // Crear Pedido
    sheetP.appendRow([
      pedidoId, solicitanteId, "", ot, "Pendiente", 
      "", "", ahora, "", "", "", "", "email@solicitante.com", notas
    ]);
    
    // Crear Items del Pedido
    items.forEach(item => {
      sheetPI.appendRow([
        Utilities.getUuid(), pedidoId, item.sku, item.cantidad, 0, "Pendiente"
      ]);
    });
    
    return pedidoId;
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Pañolero marca pedido como 'Reservado'.
 * Reserva stock físico.
 */
function prepararPedido(pedidoId, panoleroId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  
  try {
    const items = obtenerItemsPedido(pedidoId);
    let todoOk = true;
    
    items.forEach(item => {
      if (!reservarStockItem(item.sku, item.cantidad)) {
        todoOk = false; // Al menos un ítem falló
      }
    });
    
    if (todoOk) {
      actualizarEstadoPedido(pedidoId, "Reservado", panoleroId);
    }
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Genera Token QR y envía email.
 * Estado: Listo
 */
function marcarListoYGenerarToken(pedidoId) {
  const tokenUUID = Utilities.getUuid();
  const tokenCorto = tokenUUID.substring(0, 6).toUpperCase();
  const expiracion = new Date();
  expiracion.setHours(expiracion.getHours() + 48);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_PEDIDOS);
  const rowIndex = buscarFilaPedido(pedidoId);
  
  if (rowIndex > 0) {
    // Actualizar Cols F, G, J, L (Token_UUID, Token_Corto, Fecha_Listo, Expiracion)
    sheet.getRange(rowIndex, 6).setValue(tokenUUID);
    sheet.getRange(rowIndex, 7).setValue(tokenCorto);
    sheet.getRange(rowIndex, 10).setValue(new Date());
    sheet.getRange(rowIndex, 12).setValue(expiracion);
    sheet.getRange(rowIndex, 5).setValue("Listo");
    
    // Enviar Email
    enviarEmailQR(pedidoId, tokenUUID, tokenCorto);
  }
}

/**
 * Valida entrega al escanear QR.
 * Descuenta stock definitivamente.
 */
function validarEntregaQR(token) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  
  try {
    const pedido = buscarPedidoPorToken(token);
    if (!pedido) return "ERROR: Token inválido";
    if (pedido.estado !== "Listo") return `ERROR: Estado es ${pedido.estado}`;
    
    // Ejecutar entrega
    const items = obtenerItemsPedido(pedido.id);
    items.forEach(item => {
      descontarStockDefinitivo(item.sku, item.cantidad);
    });
    
    // Actualizar Pedido
    actualizarEstadoPedido(pedido.id, "Entregado");
    return "EXITO: Entrega registrada";
    
  } catch (e) {
    return `ERROR: ${e.toString()}`;
  } finally {
    lock.releaseLock();
  }
}

// ─── FUNCIONES AUXILIARES ───────────────────────────────────

function verificarStockBajo(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_ITEMS);
  const data = sheet.getRange(row, 1, 1, 10).getValues()[0];
  
  const sku = data[0];
  const stockActual = data[3];
  const stockReservado = data[4];
  const rop = data[8];
  
  const disponible = stockActual - stockReservado;
  
  if (disponible <= rop) {
    MailApp.sendEmail({
      to: EMAIL_ADMIN,
      subject: `⚠️ ALERTA STOCK BAJO: ${sku}`,
      htmlBody: `
        <h2>Alerta de Reabastecimiento</h2>
        <p>El ítem <strong>${sku}</strong> (${data[1]}) ha llegado a su punto de reorden.</p>
        <ul>
          <li>Stock Actual: ${stockActual}</li>
          <li>Stock Reservado: ${stockReservado}</li>
          <li><strong>Disponible: ${disponible}</strong></li>
          <li>ROP: ${rop}</li>
        </ul>
        <p>Por favor generar solicitud de compra.</p>
      `
    });
  }
}

function reservarStockItem(sku, cantidad) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_ITEMS);
  // Buscar fila por SKU (simplificado, usar hash map en prod)
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sku) {
      const stockActual = data[i][3];
      const reservado = data[i][4];
      
      if ((stockActual - reservado) >= cantidad) {
        sheet.getRange(i + 1, 5).setValue(reservado + cantidad);
        return true;
      }
      return false; // Sin stock
    }
  }
  return false;
}

function descontarStockDefinitivo(sku, cantidad) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_ITEMS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sku) {
      const stockActual = data[i][3];
      const reservado = data[i][4];
      
      sheet.getRange(i + 1, 4).setValue(stockActual - cantidad);
      sheet.getRange(i + 1, 5).setValue(reservado - cantidad);
      
      // Registrar Movimiento
      registrarMovimiento("Salida", sku, cantidad, "Confirmado");
      break;
    }
  }
}

function registrarMovimiento(tipo, sku, cantidad, estado) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_MOVIMIENTOS);
  sheet.appendRow([
    Utilities.getUuid(), new Date(), tipo, sku, cantidad, 
    "System", "", "", estado
  ]);
}

// ... Resto de funciones helper (buscarPedido, obtenerItems, etc.)
