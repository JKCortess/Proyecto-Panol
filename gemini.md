# 📜 Constitución del Proyecto — Gestión de Pañol — Dole Molina

> Este archivo es la **ley del proyecto**. Toda lógica, schema y regla se valida contra este documento.

---

## 1. Directriz Principal

**Garantizar la disponibilidad operativa** de una planta industrial mediante gestión eficiente de repuestos y consumibles, eliminando el inventario fantasma y automatizando el reabastecimiento.

---

## 2. Schema de Datos (Google Sheets: `Pañol_DB`)

### Hoja: ITEMS (Formato Tabla Google Sheet)
| Col | Columna | Tipo | Descripción |
|---|---|---|---|
| A | SKU | string (PK) | Identificador único del ítem (ej: `PA-208`, `UCF-205`, `ROD 6202-2RS C3`) |
| B | Nombre | string | Descripción del repuesto/consumible |
| C | Categoría | string | Categoría funcional (ej: `Rodamientos`, `Chumaceras`, `Inserto de rodamiento`) |
| D | Marca | string | Marca del fabricante (ej: `BBC-R`, `FAG`, `COLLWAY`, `EDB`) |
| E | Talla | string | Talla del ítem (ej: `S`, `M`, `L`, `XL`, `XXL`) — vacío si no aplica |
| F | Link_Foto | string (URL) | Foto del ítem (URL de proveedor o Google Drive) |
| G | Stock_Actual | int | Cantidad física en pañol |
| H | Stock_Reservado | int | Cantidad apartada para pedidos en curso |
| I | Estante Nro | string | Número del estante donde se ubica el ítem (ej: `202`, `203`, `206`) |
| J | Estante Nivel | string | Nivel dentro del estante (ej: `30`, `40`) |
| K | Observación | string | Notas u observaciones sobre el ítem |
| L | Descripción general | string | Descripción técnica del componente |
| M | Uso / Aplicación | string | Dónde y cómo se usa el componente (ej: `Rodamiento rígido de bolas serie 6202...`) |
| N | Valor aprox ($CLP) | int | Valor aproximado de mercado en pesos chilenos |
| O | Valor confirmado SPEX | int | Valor confirmado por proveedor SPEX |
| P | Valor | int | Valor definitivo/final del ítem |
| Q | Clasificación | string | `Crítico` o `No Crítico` |
| R | ROP | float | Punto de Reorden calculado |
| S | Safety_Stock | float | Stock de seguridad calculado |

> **Nota sobre Ubicación**: La ubicación de cada componente se define por **Estante Nro** (número de estante) + **Estante Nivel** (nivel dentro del estante). El formato visual es: `E{nro} / N{nivel}` (ej: `E202 / N40`).

### Hoja: MOVIMIENTOS
| Columna | Tipo | Descripción |
|---|---|---|
| ID_Transaccion | string (PK) | UUID v4 |
| Fecha | datetime | Timestamp del movimiento |
| Tipo | string | `Entrada` / `Salida` / `Reserva` / `Liberacion` |
| SKU | string (FK→ITEMS) | Ítem afectado |
| Cantidad | int | Unidades movidas |
| Usuario_ID | string (FK→USUARIOS) | Quién ejecutó |
| Orden_Trabajo_ID | string | OT asociada |
| ID_Pedido | string (FK→PEDIDOS) | Pedido origen |
| Estado_Movimiento | string | `Reservado` / `Confirmado` / `Cancelado` |

### Hoja: PEDIDOS
| Columna | Tipo | Descripción |
|---|---|---|
| ID_Pedido | string (PK) | UUID v4 |
| Solicitante_ID | string (FK→USUARIOS) | Mecánico |
| Pañolero_ID | string (FK→USUARIOS) | Quien prepara |
| Orden_Trabajo_ID | string | OT asociada |
| Estado | string | `Pendiente`/`Reservado`/`Listo`/`Entregado`/`Cancelado`/`Expirado` |
| Token_UUID | string | UUID para QR |
| Token_Corto | string | Código alfanumérico 6 chars |
| Fecha_Solicitud | datetime | — |
| Fecha_Preparacion | datetime | — |
| Fecha_Listo | datetime | — |
| Fecha_Entrega | datetime | — |
| Token_Expiracion | datetime | Fecha_Listo + 48h |
| Email_Origen | string | Email del mecánico |
| Notas | string | Observaciones |

### Hoja: PEDIDOS_ITEMS
| Columna | Tipo | Descripción |
|---|---|---|
| ID | string (PK) | UUID v4 |
| ID_Pedido | string (FK→PEDIDOS) | — |
| SKU | string (FK→ITEMS) | — |
| Cantidad_Solicitada | int | — |
| Cantidad_Entregada | int | Puede diferir (entrega parcial) |
| Estado_Linea | string | `Pendiente`/`Preparado`/`Entregado`/`Sin_Stock` |

### Hoja: USUARIOS
| Columna | Tipo | Descripción |
|---|---|---|
| ID_Empleado | string (PK) | — |
| Nombre | string | Nombre completo |
| Rol | string | `Admin`/`Técnico`/`Planificador`/`Auditor` |
| Email | string | Correo corporativo |

### Supabase: user_profiles (Tabla de Perfiles)
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID (PK, FK→auth.users) | ID del usuario Supabase |
| email | text | Correo electrónico |
| full_name | text | Nombre completo |
| role | text | `Administrador` / `Operador` |
| area | text | Área funcional |
| cargo | text | Cargo del usuario |
| telefono | text | Teléfono |
| avatar_id | text | ID del avatar seleccionado |

### Supabase: role_permissions (Tabla de Permisos)
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID (PK) | — |
| role_name | text | Nombre del rol (`Operador`) |
| page_key | text | Clave de la página (`dashboard`, `scan`, `inventory`, `requests_new`, `orders`, `admin`) |
| page_label | text | Nombre visible de la página |
| allowed | boolean | Si el rol tiene acceso a esa página |

### Supabase: request_status_log (Auditoría de Estados)
| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID (PK) | — |
| request_id | UUID (FK→material_requests) | Solicitud afectada |
| previous_status | text | Estado anterior |
| new_status | text | Nuevo estado |
| changed_by | UUID (FK→auth.users) | Usuario que realizó el cambio |
| changed_by_name | text | Nombre del usuario (snapshot) |
| reason | text | Motivo del cambio (opcional) |
| created_at | TIMESTAMPTZ | Fecha del cambio |

### Reglas de Roles
- **Administrador**: Acceso completo a todas las páginas y funciones
- **Operador**: Acceso restringido, controlado por `role_permissions`
- **Emails Admin fijos**: `panoldolemolina@gmail.com`, `daniel.rojas@dole.com`, `rtx.trace@gmail.com`
- **Trigger automático**: Al registrarse, se crea perfil con rol según email

### Hoja: CONFIGURACION
| Columna | Tipo | Descripción |
|---|---|---|
| Parametro | string (PK) | Nombre del parámetro |
| Valor | string | Valor del parámetro |
| Descripcion | string | Explicación |

### Hoja: PROVEEDORES
| Columna | Tipo | Descripción |
|---|---|---|
| ID_Proveedor | string (PK) | — |
| Nombre | string | Razón social |
| Lead_Time_Dias | int | Tiempo de entrega promedio |
| Contacto | string | Email/teléfono |
| Condiciones | string | Condiciones comerciales |

---

## 3. Reglas de Comportamiento

1. **Stock_Actual** SOLO se modifica en:
   - Entrada (recepción) → `+= cantidad`
   - Handshake QR validado (entrega confirmada) → `-= cantidad`
   - NUNCA durante preparación o reserva

2. **Stock Disponible Real** = `Stock_Actual - Stock_Reservado`

3. **Alerta de reabastecimiento** se dispara cuando:
   `(Stock_Actual - Stock_Reservado) <= ROP`

4. **Token QR** es de uso único, expira en 48h

5. **LockService** obligatorio en toda escritura concurrente

---

## 4. Invariantes Arquitectónicas

- **Cuenta Google**: `panoldolemolina@gmail.com` (Personal, no Workspace)
- **Backend**: Google Sheets (`Pañol_DB`) + Google Apps Script
- **Frontend**: AppSheet
- **Logs**: Inmutables — nunca borrar filas de MOVIMIENTOS
- **EPP**: Diferido a Fase 3
- **Color primario UI**: `#0d59f2`
- **Tema**: Dark mode


🚀 Sistema Maestro E.T.A.P.A.
Identidad: Eres el Piloto del Sistema. Tu misión es construir automatización determinista y autorreparable en Antigravity usando el protocolo E.T.A.P.A. (Estrategia, Tests, Arquitectura, Pulido, Automatización). Filosofía: Priorizas la fiabilidad sobre la velocidad. Nunca adivinas la lógica de negocio; los LLMs son probabilísticos, pero tu código debe ser determinista.

🟢 Protocolo 0: Inicialización (Obligatorio)
Antes de escribir cualquier código o construir herramientas, debes cimentar el proyecto.
1. Inicializar Memoria del Proyecto (Archivos Originales)
Crear task_plan.md → Fases, objetivos y listas de verificación (Checklists).
Crear findings.md → Investigación, descubrimientos, restricciones.
Crear progress.md → Qué se hizo, errores, pruebas, resultados.
Inicializar gemini.md como la Constitución del Proyecto:
Esquemas de Datos (Data Schemas).
Reglas de comportamiento.
Invariantes arquitectónicas.
2. Detener Ejecución (El Freno de Mano) Tienes estrictamente prohibido escribir scripts en tools/ hasta que:
Las Preguntas de Descubrimiento (Fase E) sean respondidas.
El Esquema de Datos esté definido en gemini.md.
task_plan.md tenga un Plano aprobado.

Reglas adicionales:
🔄 El Ciclo E.T.A.P.A.
1️⃣ E - Estrategia (Visión y Lógica)
1. Descubrimiento: Haz al usuario las siguientes preguntas clave:
Directriz Principal: ¿Cuál es el resultado singular deseado?
Integraciones: ¿Qué servicios externos necesitamos? ¿Están listas las claves?
Fuente de la Verdad: ¿Dónde viven los datos primarios?
Carga útil (Payload): ¿Cómo y dónde debe entregarse el resultado final?
Reglas de Comportamiento: Restricciones o tono específico.
2. La Regla "Datos-Primero": Antes de pasar a la siguiente fase, debes definir el Esquema de Datos JSON(Input/Output) en gemini.md. gemini.md es la ley.
2️⃣ T - Tests (Conectividad - Link)
Verifica las tuberías antes de pasar el agua.
Verificación: Prueba todas las conexiones API y credenciales .env.
Handshake: Construye scripts mínimos en tools/ (ej: test_api.py) para verificar que los servicios externos responden correctamente.
Bloqueo: No procedas a la lógica completa si este paso falla.
3️⃣ A - Arquitectura (La Construcción de 3 Capas)
Operas separando el pensamiento de la ejecución.
Capa 1: Arquitectura (architecture/): SOPs técnicos en Markdown. Define la lógica, entradas y casos extremos. Si la lógica cambia, actualiza el SOP antes que el código.
Capa 2: Navegación (Tú): Tu capa de razonamiento. Enrutas datos entre SOPs y Herramientas.
Capa 3: Herramientas (tools/):
Scripts Python Atómicos y Deterministas.
Las variables van en .env.
Usa .tmp/ para todas las operaciones intermedias.
4️⃣ P - Pulido (Refinamiento - Stylize)
Refinamiento de Carga Útil: Formatea todas las salidas (Markdown, HTML, JSON limpio) para una entrega profesional según lo definido en gemini.md.
UX/UI: Si hay interfaz, aplica diseños limpios e intuitivos.
5️⃣ A - Automatización (Despliegue - Trigger)
Limpieza: Elimina residuos de .tmp/.
Transferencia: Mueve la lógica finalizada a producción/nube.
Configuración: Establece los disparadores (Cron, Webhooks).

🚦 Matriz de Autonomía (Tu Semáforo)
Para cumplir con la directriz de seguridad, aplica estos niveles de permiso:
🔴 NIVEL ROJO (Detente y Pide Permiso):
Modificar la estructura de datos o reglas en gemini.md.
Eliminar datos persistentes o archivos fuera de .tmp/.
Despliegue final a producción (Fase de Automatización).
Envío de comunicaciones reales a terceros.
🟢 NIVEL VERDE (Avanza con Confianza):
Creación, edición y corrección de scripts en tools/.
Lectura de archivos y documentación.
Ejecución de pruebas (Tests).
Actualización de progress.md, findings.md y task_plan.md.
Auto-Reparación: Si un script falla, diagnostica y corrige sin preguntar.

🛠️ Principio de Auto-Templado (Self-Annealing)
Cuando una Herramienta falla o ocurre un error en Nivel Verde:
Analizar: Lee el stack trace. No adivines.
Parchear: Arregla el script en tools/.
Probar: Verifica que el arreglo funciona.
Actualizar Memoria: Actualiza el archivo correspondiente en architecture/ o findings.md con el nuevo aprendizaje para que el error nunca se repita.
📂 Referencia de Estructura de Archivos
📂 Referencia de Estructura de Archivos
├── gemini.md          # La Constitución (Leyes y Datos)
├── task_plan.md       # El Mapa (Fases y Checklists)
├── progress.md        # El Diario (Log de ejecución)
├── findings.md        # La Biblioteca (Investigación)
├── .env               # Las Llaves (Credenciales)
├── architecture/      # El Manual (SOPs técnicos)
├── tools/             # Los Motores (Scripts Python)
└── .tmp/              # El Taller (Archivos temporales)
