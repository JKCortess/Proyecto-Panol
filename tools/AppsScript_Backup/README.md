# Cómo instalar los Scripts de Automatización

Estos archivos contienen la lógica avanzada del Pañol (Fase 3). 
Para instalarlos:

1. Abre tu Google Sheet `Pañol_DB`.
2. Ve a **Extensiones > Apps Script**.
3. Verás un archivo `Code.gs` por defecto.
4. Abre `Code.gs` en este repositorio (`tools/AppsScript_Backup/Code.gs`), copia todo el contenido y reemplaza el contenido en el editor de Apps Script.
5. Guarda el proyecto con el nombre `PañolAutomation`.

## Configuración de Triggers (Disparadores)

Para que las alertas funcionen automáticamente:

1. En el editor de Apps Script, ve al menú izquierdo **Disparadores** (ícono de reloj).
2. Haz clic en **Añadir disparador**.
3. Configura:
   - Función: `onEdit`
   - Despliegue: `Head`
   - Fuente del evento: `De la hoja de cálculo`
   - Tipo de evento: `Al editar`
4. Guarda. (Te pedirá permisos, acéptalos).

## Configuración de Limpieza Programada

1. Añadir otro disparador.
2. Configura:
   - Función: `limpiarPedidosExpirados`
   - Fuente del evento: `Según tiempo`
   - Tipo de activador: `Temporizador por horas` -> `Cada 6 horas`
3. Guarda.
