
import { getInventory, type InventoryItem } from "@/lib/data";

/**
 * AI tool functions that query inventory data from Google Sheets
 * via getInventory() — the same source of truth as the Inventory page.
 * This ensures the AI assistant always sees the latest data without
 * needing manual sync to a separate Supabase table.
 */

/**
 * Searches inventory items by name, category, brand, or SKU.
 * Returns matching items with stock and location info.
 */
export async function searchInventory(params: {
    query?: string;
    categoria?: string;
    marca?: string;
    limit?: number;
}): Promise<string> {
    const allItems = await getInventory();
    let filtered = allItems;

    if (params.query) {
        const q = params.query.toLowerCase();
        filtered = filtered.filter((item) =>
            item.nombre.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            item.descripcion_general.toLowerCase().includes(q) ||
            item.uso_aplicacion.toLowerCase().includes(q) ||
            item.observacion.toLowerCase().includes(q) ||
            item.categoria.toLowerCase().includes(q) ||
            item.marca.toLowerCase().includes(q)
        );
    }
    if (params.categoria) {
        const cat = params.categoria.toLowerCase();
        filtered = filtered.filter((item) =>
            item.categoria.toLowerCase().includes(cat)
        );
    }
    if (params.marca) {
        const marca = params.marca.toLowerCase();
        filtered = filtered.filter((item) =>
            item.marca.toLowerCase().includes(marca)
        );
    }

    // Sort by name and limit results
    filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
    const limited = filtered.slice(0, params.limit || 25);

    if (limited.length === 0) return "No se encontraron ítems con esos criterios.";

    const results = limited.map((item) => {
        const disponible = (item.stock || 0) - (item.reservado || 0);
        const ubicacion = item.estante_nro && item.estante_nivel
            ? `E${item.estante_nro}/N${item.estante_nivel}`
            : "Sin ubicación";
        const talla = item.talla ? ` | Talla: ${item.talla}` : "";
        const valor = item.valor ? ` | Valor: $${item.valor.toLocaleString("es-CL")} CLP` : "";
        const clasif = item.clasificacion ? ` | ${item.clasificacion}` : "";
        const desc = item.descripcion_general ? `\n   Descripción: ${item.descripcion_general}` : "";
        const uso = item.uso_aplicacion ? `\n   Uso: ${item.uso_aplicacion}` : "";
        const obs = item.observacion ? `\n   Obs: ${item.observacion}` : "";
        const ropWarning = item.rop && disponible <= item.rop ? " ⚠️ BAJO ROP" : "";
        const imgUrl = item.foto || (item.fotos && item.fotos.length > 0 ? item.fotos[0] : "");
        const cardData = imgUrl ? JSON.stringify({ sku: item.sku, name: item.nombre, cat: item.categoria || "", img: imgUrl, val: item.valor || 0 }) : "";
        const productCard = cardData ? `\n   [PRODUCT_CARD:${cardData}]` : "";

        return `📦 ${item.nombre} (SKU: ${item.sku})${talla}${clasif}
   Stock: ${item.stock} total | ${item.reservado} reservado | ${disponible} disponible${ropWarning}
   Ubicación: ${ubicacion}${valor}${desc}${uso}${obs}${productCard}`;
    });

    return `Encontrados ${limited.length} ítems${filtered.length > limited.length ? ` (mostrando ${limited.length} de ${filtered.length})` : ""}:\n\n${results.join("\n---\n")}`;
}

/**
 * Counts stock totals by category, with detailed breakdown.
 */
export async function countStock(params: {
    categoria?: string;
    agrupacion?: string;
}): Promise<string> {
    const allItems = await getInventory();
    let data: InventoryItem[] = allItems;

    if (params.categoria) {
        const cat = params.categoria.toLowerCase();
        data = data.filter((item) =>
            item.categoria.toLowerCase().includes(cat)
        );
    }

    if (data.length === 0) return "No se encontraron ítems en esa categoría.";

    const totalStock = data.reduce((sum, i) => sum + (i.stock || 0), 0);
    const totalReservado = data.reduce((sum, i) => sum + (i.reservado || 0), 0);
    const totalDisponible = totalStock - totalReservado;
    const totalValor = data.reduce((sum, i) => sum + ((i.valor || 0) * (i.stock || 0)), 0);

    // Group by category or brand
    const groupBy = params.agrupacion === "marca" ? "marca" : "categoria";
    const groups = new Map<string, { count: number; stock: number; reserved: number; value: number }>();
    data.forEach((item) => {
        const key = (item as Record<string, unknown>)[groupBy] as string || "Sin clasificar";
        const existing = groups.get(key) || { count: 0, stock: 0, reserved: 0, value: 0 };
        existing.count++;
        existing.stock += item.stock || 0;
        existing.reserved += item.reservado || 0;
        existing.value += (item.valor || 0) * (item.stock || 0);
        groups.set(key, existing);
    });

    const breakdown = Array.from(groups.entries())
        .sort((a, b) => b[1].stock - a[1].stock)
        .map(([key, g]) => `  - ${key}: ${g.count} ítems, ${g.stock} unidades (${g.stock - g.reserved} disponibles), valor $${g.value.toLocaleString("es-CL")}`)
        .join("\n");

    return `📊 Resumen de Stock${params.categoria ? ` — "${params.categoria}"` : " — Todo el inventario"}:
Total ítems: ${data.length}
Stock total: ${totalStock} unidades
Reservado: ${totalReservado} unidades
Disponible: ${totalDisponible} unidades
Valor total estimado: $${totalValor.toLocaleString("es-CL")} CLP

Desglose por ${groupBy === "marca" ? "marca" : "categoría"}:
${breakdown}`;
}

/**
 * Gets detailed info for a specific item by SKU.
 */
export async function getItemDetail(params: { sku: string }): Promise<string> {
    const allItems = await getInventory();
    const data = allItems.find((item) => item.sku === params.sku);

    if (!data) return `No se encontró un ítem con SKU "${params.sku}".`;

    const disponible = (data.stock || 0) - (data.reservado || 0);
    const ubicacion = data.estante_nro && data.estante_nivel
        ? `Estante ${data.estante_nro} / Nivel ${data.estante_nivel}`
        : "Sin ubicación asignada";

    const imgUrl = data.foto || (data.fotos && data.fotos.length > 0 ? data.fotos[0] : "");
    const cardData = imgUrl ? JSON.stringify({ sku: data.sku, name: data.nombre, cat: data.categoria || "", img: imgUrl, val: data.valor || 0 }) : "";
    const productCard = cardData ? `\n\n[PRODUCT_CARD:${cardData}]` : "";

    return `📦 DETALLE COMPLETO: ${data.nombre}
SKU: ${data.sku}
Categoría: ${data.categoria || "N/A"}
Marca: ${data.marca || "N/A"}
Talla: ${data.talla || "N/A"}
Clasificación: ${data.clasificacion || "N/A"}${productCard}

📊 Stock:
  - Total: ${data.stock}
  - Reservado: ${data.reservado}
  - Disponible: ${disponible}${disponible <= (data.rop || 0) ? " ⚠️ BAJO PUNTO DE REORDEN" : ""}
  - ROP: ${data.rop || "N/A"} | Safety Stock: ${data.safety_stock || "N/A"}

📍 Ubicación: ${ubicacion}

💰 Valores:
  - Aprox CLP: $${(data.valor_aprox_clp || 0).toLocaleString("es-CL")}
  - Confirmado SPEX: $${(data.valor_confirmado_spex || 0).toLocaleString("es-CL")}
  - Valor final: $${(data.valor || 0).toLocaleString("es-CL")}

📝 Descripción: ${data.descripcion_general || "Sin descripción"}
🔧 Uso/Aplicación: ${data.uso_aplicacion || "Sin info"}
📌 Observación: ${data.observacion || "Sin observación"}`;
}

/**
 * Lists all categories with item counts.
 */
export async function listCategories(): Promise<string> {
    const allItems = await getInventory();

    if (allItems.length === 0) return "No hay ítems en el inventario.";

    const categories = new Map<string, { count: number; stock: number; available: number }>();
    allItems.forEach((item) => {
        const cat = item.categoria || "Sin categoría";
        const existing = categories.get(cat) || { count: 0, stock: 0, available: 0 };
        existing.count++;
        existing.stock += item.stock || 0;
        existing.available += (item.stock || 0) - (item.reservado || 0);
        categories.set(cat, existing);
    });

    const list = Array.from(categories.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([cat, info]) => `  - ${cat}: ${info.count} ítems, ${info.stock} unidades (${info.available} disponibles)`)
        .join("\n");

    return `📋 Categorías del Inventario (${allItems.length} ítems totales):
${list}`;
}

/**
 * Finds items with low stock (below ROP).
 */
export async function findLowStock(): Promise<string> {
    const allItems = await getInventory();
    const withRop = allItems.filter((item) => item.rop > 0);

    if (withRop.length === 0) return "No hay ítems con ROP configurado.";

    const lowStock = withRop.filter((item) => {
        const disponible = (item.stock || 0) - (item.reservado || 0);
        return disponible <= (item.rop || 0);
    });

    if (lowStock.length === 0) return "✅ Todos los ítems están por encima de su punto de reorden.";

    const list = lowStock.map((item) => {
        const disponible = (item.stock || 0) - (item.reservado || 0);
        const ubicacion = item.estante_nro ? `E${item.estante_nro}/N${item.estante_nivel}` : "";
        return `  ⚠️ ${item.nombre} (${item.sku}) — ${disponible} disponibles / ROP: ${item.rop} [${ubicacion}]`;
    }).join("\n");

    return `🚨 Ítems con stock bajo (${lowStock.length} de ${withRop.length} monitoreados):
${list}`;
}

/**
 * Tool definitions for Gemini function calling.
 */
export const AI_TOOLS = [
    {
        function_declarations: [
            {
                name: "buscar_inventario",
                description: "Busca ítems en el inventario del pañol por nombre, categoría, marca o SKU. Retorna detalles de stock, ubicación y descripción.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: {
                            type: "STRING",
                            description: "Texto de búsqueda: nombre del ítem, descripción o palabras clave (ej: 'guantes', 'rodamiento', 'soldadura')",
                        },
                        categoria: {
                            type: "STRING",
                            description: "Filtrar por categoría (ej: 'Ropa', 'EPP', 'Herramientas', 'Rodamientos')",
                        },
                        marca: {
                            type: "STRING",
                            description: "Filtrar por marca (ej: 'MSA', '3M', 'SKF')",
                        },
                    },
                },
            },
            {
                name: "contar_stock",
                description: "Cuenta el stock total, disponible y valor por categoría o de todo el inventario. Útil para resúmenes y totales numéricos precisos.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        categoria: {
                            type: "STRING",
                            description: "Categoría a contar (ej: 'Ropa', 'EPP'). Dejar vacío para todo el inventario.",
                        },
                        agrupacion: {
                            type: "STRING",
                            description: "Cómo agrupar los resultados: 'categoria' o 'marca'",
                            enum: ["categoria", "marca"],
                        },
                    },
                },
            },
            {
                name: "detalle_item",
                description: "Obtiene información completa y detallada de un ítem específico por su código SKU.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        sku: {
                            type: "STRING",
                            description: "Código SKU del ítem (ej: '401-GPAZ-01')",
                        },
                    },
                    required: ["sku"],
                },
            },
            {
                name: "listar_categorias",
                description: "Lista todas las categorías disponibles en el inventario con cantidad de ítems y stock total por categoría.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                },
            },
            {
                name: "items_stock_bajo",
                description: "Encuentra todos los ítems con stock por debajo de su punto de reorden (ROP). Útil para alertas de reabastecimiento.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                },
            },
        ],
    },
];

/**
 * Executes a tool call from the AI agent.
 */
export async function executeToolCall(
    name: string,
    args: Record<string, unknown>
): Promise<string> {
    switch (name) {
        case "buscar_inventario":
            return searchInventory(args as { query?: string; categoria?: string; marca?: string });
        case "contar_stock":
            return countStock(args as { categoria?: string; agrupacion?: string });
        case "detalle_item":
            return getItemDetail(args as { sku: string });
        case "listar_categorias":
            return listCategories();
        case "items_stock_bajo":
            return findLowStock();
        default:
            return `Herramienta desconocida: ${name}`;
    }
}

/**
 * Builds the system prompt for the AI assistant (now tool-based).
 */
export function buildSystemPrompt(botName: string, customInstructions: string = ""): string {
    let prompt = `Eres "${botName}", el asistente técnico especializado del Pañol de Mantenimiento de la planta Dole Molina (Chile). Eres un profesional con amplio conocimiento en equipos de protección personal (EPP), herramientas industriales, rodamientos, chumaceras, repuestos industriales y consumibles de mantención.

## TU PERSONALIDAD
- Mantienes un tono formal, técnico y profesional en todo momento
- Tratas al usuario de "usted"
- Eres conciso, claro y directo en tus respuestas
- Usas emojis con moderación y solo para indicadores funcionales (📊📍⚠️✅)
- Si los datos del ítem incluyen etiquetas [PRODUCT_CARD:...] o [ITEM_IMG:...], SIEMPRE inclúyelas tal cual en tu respuesta, sin modificarlas. Estas etiquetas muestran tarjetas interactivas del producto. Nunca las omitas ni las modifiques.
- Eres proactivo: si alguien pregunta por un tipo de trabajo, sugieres TODOS los elementos de protección y materiales relevantes en el inventario
- Siempre indicas la ubicación del estante para facilitar la localización del material

## CONOCIMIENTO TÉCNICO
Eres experto en las siguientes áreas y DEBES proporcionar recomendaciones técnicas cuando te consulten:

### Equipos de Protección Personal (EPP)
- **Guantes**: Conoces las diferencias entre guantes de nitrilo (resistencia química), PU (destreza y agarre fino), cuero (trabajo pesado y calor moderado), anticorte (niveles ANSI A1-A9), dieléctricos (protección eléctrica), soldador (calor y chispas). Sabes recomendar según el tipo de riesgo: corte, abrasión, químicos, temperatura, eléctrico.
- **Protección respiratoria**: Conoces las diferencias entre mascarillas desechables (N95, P100), respiradores de media cara, filtros para partículas vs. gases/vapores, y cuándo usar cada uno según el contaminante.
- **Protección visual**: Sabes distinguir entre antiparras (hermeticidad), lentes de seguridad (impacto), caretas faciales (proyección de partículas/salpicaduras) y lentes para soldadura (tonos de sombra según amperaje).
- **Protección auditiva**: Conoces los niveles de atenuación (NRR) de tapones vs. orejeras y cuándo se recomienda doble protección.
- **Protección contra caídas**: Conoces arneses, líneas de vida, puntos de anclaje y cuándo son obligatorios según la normativa chilena (trabajo en altura ≥ 1.8m).
- **Ropa de protección**: Sabes diferenciar ropa ignífuga (FR), antiácida, de alta visibilidad, y térmica según la aplicación.

### Herramientas y Materiales Industriales
- **Rodamientos y chumaceras**: Conoces tipos (bolas, rodillos, cónicos, axiales), materiales de jaula, sellos, rangos de temperatura y criterios de selección por carga y velocidad.
- **Herramientas de corte**: Sabes recomendar discos de corte y desbaste según el material (acero, inox, concreto), diámetros y RPM máximas.
- **Soldadura**: Conoces tipos de electrodos (E6011, E7018, E308L, E309L), alambres MIG/TIG, gases de protección y la EPP requerida para cada proceso.
- **Productos químicos**: Conoces lubricantes, desengrasantes, penetrantes, selladores y sus fichas de seguridad básicas (SDS).

## INTERPRETACIÓN CONTEXTUAL (MUY IMPORTANTE)
Eres un experto de pañol. Los usuarios frecuentemente hacen preguntas informales, abreviadas o genéricas. DEBES analizar el contexto e inferir a qué se refieren antes de responder o buscar en el inventario. Reglas:

1. **Deduce el producto implícito**: Si alguien dice "los de PU", "los de nitrilo", "los de cuero" → se refiere a **guantes**. Si dice "las N95" → **mascarillas**. Si dice "los 6011" → **electrodos E6011**. Usa tu conocimiento técnico para completar la referencia.
2. **Asocia materiales con productos**: "PU" y "nitrilo" son materiales de guantes. "Kevlar" es fibra anticorte para guantes. "Policarbonato" es material de lentes de seguridad. Siempre traduce el material al producto correspondiente.
3. **Entiende el contexto del trabajo**: Si el usuario menciona un tipo de trabajo (corte, soldadura, manejo de químicos), deduce TODOS los EPP y herramientas que necesitará para ese trabajo y recomiéndalos proactivamente.
4. **Preguntas comparativas**: Si el usuario pregunta "¿los de PU o los de nitrilo para corte?", entiende que pregunta qué tipo de GUANTE es mejor para trabajar con herramientas de corte. Responde con una comparación técnica fundamentada.
5. **Nunca respondas literalmente**: No busques "PU" como texto suelto. Interpreta que "PU" en contexto de EPP = "guantes de PU" y busca "guantes PU" o "guantes poliuretano" en el inventario.
6. **Preguntas básicas**: Si alguien pregunta algo muy simple como "¿qué tienen?" o "¿qué hay de guantes?", no pida más detalles innecesarios. Busque directamente y muestre lo disponible.

Ejemplos de interpretación:
- "recomiéndame los de PU o nitrilo para corte" → El usuario pregunta qué GUANTE (PU vs nitrilo) es mejor para trabajo con herramientas de corte. Buscar "guantes PU" y "guantes nitrilo".
- "necesito algo para soldar" → Buscar todo el EPP de soldadura: guantes soldador, careta, delantal, polainas, y los electrodos/alambre disponibles.
- "¿tienen las 3M?" → En contexto de EPP, probablemente mascarillas o lentes marca 3M. Buscar por marca "3M".
- "dame los anticorte" → Guantes anticorte. Buscar "guantes anticorte" o "guantes corte".

## PROTOCOLO DE RECOMENDACIONES TÉCNICAS
Cuando el usuario haga una pregunta técnica sobre qué producto usar, qué EPP elegir, o cualquier decisión técnica:
1. Primero interpreta correctamente qué está preguntando (usa las reglas de interpretación contextual)
2. Proporciona tu recomendación profesional con fundamento técnico claro
3. Busca en el inventario los ítems disponibles que correspondan usando los términos correctos inferidos
4. **SIEMPRE** finaliza con una nota indicando que se recomienda confirmar la selección con el Prevencionista de Riesgos o el supervisor del área, ya que ellos conocen las condiciones específicas del lugar de trabajo y los protocolos internos de la planta

Ejemplo de cierre: "Le recomiendo validar esta selección con el Prevencionista de Riesgos de la planta, quien podrá confirmar que el EPP seleccionado cumple con los protocolos específicos del área de trabajo."

## TUS HERRAMIENTAS
Tienes acceso a herramientas que consultan la base de datos del inventario en tiempo real:
1. **buscar_inventario**: Busca ítems por nombre, categoría o marca
2. **contar_stock**: Cuenta stock total y valor por categoría (para cálculos precisos)
3. **detalle_item**: Obtiene todo el detalle de un ítem por su SKU
4. **listar_categorias**: Lista todas las categorías con su stock
5. **items_stock_bajo**: Muestra ítems bajo su punto de reorden

## REGLAS DE USO DE HERRAMIENTAS
- SIEMPRE usa herramientas para responder preguntas sobre inventario. NO inventes datos de stock.
- Antes de buscar, INTERPRETA el contexto y usa los términos completos del producto (ej: busca "guantes nitrilo", NO busques solo "nitrilo")
- Para preguntas de conteo o totales, usa "contar_stock" — da números EXACTOS, no aproximados
- Para buscar un producto, usa "buscar_inventario" con palabras clave relevantes e inferidas del contexto
- Si el usuario pide algo específico, busca primero y luego responde con los datos reales
- Si no encuentras resultados, intenta con sinónimos o términos más amplios antes de decir que no hay
- Cuando compares alternativas, haz múltiples búsquedas para traer datos de cada opción
- Stock Disponible = Stock Actual - Stock Reservado
- Si Stock Disponible ≤ 0, el ítem NO está disponible
- Si Stock ≤ ROP, advierte que está en nivel crítico

## FORMATO DE RESPUESTA
Cuando mencione ítems del inventario, use este formato:
**Nombre del ítem** (SKU: XXX)
- 📊 Stock: X disponibles (de Y total)
- 📍 Ubicación: EXXX / NXXX
- ℹ️ Descripción técnica si es relevante

## ALCANCE
Responde consultas relacionadas con el inventario del pañol, recomendaciones técnicas de EPP, herramientas, materiales de mantenimiento y seguridad industrial. Si le preguntan algo completamente fuera de este ámbito, indique de forma cortés que su especialidad es el pañol y la seguridad industrial de la planta.`;

    if (customInstructions.trim()) {
        prompt += `\n\n## INSTRUCCIONES ADICIONALES DEL ADMINISTRADOR\n${customInstructions.trim()}`;
    }

    return prompt;
}
