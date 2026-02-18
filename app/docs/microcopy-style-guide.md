# Guía Editorial de Microcopy

Esta guía define cómo escribir textos en la app para mantener consistencia visual, funcional y de tono.

## 1) Tono y voz
- Usa español claro y directo.
- Prioriza lenguaje operativo: breve, específico y accionable.
- Evita tecnicismos innecesarios.
- Evita tono promocional.

## 2) Convenciones de naming
- Usa `Solicitud/Solicitudes` (no alternar con `Pedido/Pedidos` en navegación principal).
- Usa `Administrador` y `Operador` (no `Admin` en textos de interfaz).
- Usa `Ítem/Ítems` en lugar de `item(s)`.
- Usa `Gestión de Stock` como nombre oficial del módulo.

## 3) Mayúsculas y títulos
- Títulos de página: Title Case corto.
  Ejemplo: `Gestión de Solicitudes`
- Etiquetas y botones: frase breve con capitalización natural.
  Ejemplo: `Nueva solicitud`, `Confirmar entrega`, `Limpiar`
- Evita TODO EN MAYÚSCULAS salvo chips técnicos pequeños (`SKU`, `ROP`).

## 4) Acentos y ortografía
- Mantén tildes siempre: `Gestión`, `Navegación`, `Sesión`, `Categoría`, `Crítico`, `Ubicación`.
- Usa `ñ` correctamente: `Pañol`.
- Evita caracteres corruptos (`Ã`, `â`, `�`).

## 5) Botones y acciones
- Verbo en infinitivo o acción directa.
  Ejemplo: `Filtrar`, `Limpiar`, `Aceptar`, `Cancelar`.
- En acciones destructivas, explicita intención.
  Ejemplo: `Eliminar solicitud`, `Eliminar masivo`.

## 6) Mensajes de éxito/error
- Formato recomendado:
  - Éxito: `{resultado claro}`
  - Advertencia: `{problema + contexto}`
  - Error: `{qué falló} + {qué hacer}`
- Ejemplos:
  - `3 ítems retirados correctamente`
  - `2 de 5 ítems procesados`
  - `No se pudo confirmar la entrega. Intenta nuevamente.`

## 7) Fechas y horas
- Mostrar en formato local `es-CL`.
- Usar etiquetas explícitas:
  - `Fecha de solicitud`
  - `Fecha y hora`

## 8) Placeholders y ayudas
- Placeholder describe el dato esperado, no una instrucción larga.
  Ejemplo: `Nombre del administrador`, `REQ-...`, `Buscar por SKU o nombre`.
- Ayudas contextuales van debajo del campo, en texto corto.

## 9) Estados y badges
- Estados oficiales:
  - `Pendiente`
  - `Aceptada`
  - `Alerta`
  - `Cancelada`
  - `Entregada`
  - `Eliminada`
- No usar sinónimos para el mismo estado en distintas vistas.

## 10) Checklist antes de merge
- ¿El término es consistente con módulos existentes?
- ¿Tiene acentos correctos?
- ¿El botón describe claramente la acción?
- ¿El mensaje de error indica próximo paso?
- ¿Se evita mezclar español/inglés sin necesidad?
