
import { createClient } from "@/utils/supabase/server";

/**
 * SQL query functions for the AI agent.
 * These are called by the Gemini function calling mechanism
 * to provide precise, real-time inventory data.
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
    const supabase = await createClient();
    let q = supabase
        .from("inventory")
        .select("sku, name, category, brand, talla, stock_current, stock_reserved, shelf_number, shelf_level, classification, general_description, usage_application, value_final, rop, safety_stock, observation");

    if (params.query) {
        q = q.or(`name.ilike.%${params.query}%,sku.ilike.%${params.query}%,general_description.ilike.%${params.query}%,usage_application.ilike.%${params.query}%,observation.ilike.%${params.query}%`);
    }
    if (params.categoria) {
        q = q.ilike("category", `%${params.categoria}%`);
    }
    if (params.marca) {
        q = q.ilike("brand", `%${params.marca}%`);
    }

    q = q.order("name").limit(params.limit || 25);

    const { data, error } = await q;

    if (error) return `Error en consulta: ${error.message}`;
    if (!data || data.length === 0) return "No se encontraron ítems con esos criterios.";

    const results = data.map((item) => {
        const disponible = (item.stock_current || 0) - (item.stock_reserved || 0);
        const ubicacion = item.shelf_number && item.shelf_level
            ? `E${item.shelf_number}/N${item.shelf_level}`
            : "Sin ubicación";
        const talla = item.talla ? ` | Talla: ${item.talla}` : "";
        const valor = item.value_final ? ` | Valor: $${item.value_final.toLocaleString("es-CL")} CLP` : "";
        const clasif = item.classification ? ` | ${item.classification}` : "";
        const desc = item.general_description ? `\n   Descripción: ${item.general_description}` : "";
        const uso = item.usage_application ? `\n   Uso: ${item.usage_application}` : "";
        const obs = item.observation ? `\n   Obs: ${item.observation}` : "";
        const ropWarning = item.rop && disponible <= item.rop ? " ⚠️ BAJO ROP" : "";

        return `📦 ${item.name} (SKU: ${item.sku})${talla}${clasif}
   Stock: ${item.stock_current} total | ${item.stock_reserved} reservado | ${disponible} disponible${ropWarning}
   Ubicación: ${ubicacion}${valor}${desc}${uso}${obs}`;
    });

    return `Encontrados ${data.length} ítems:\n\n${results.join("\n---\n")}`;
}

/**
 * Counts stock totals by category, with detailed breakdown.
 */
export async function countStock(params: {
    categoria?: string;
    agrupacion?: string;
}): Promise<string> {
    const supabase = await createClient();

    let q = supabase.from("inventory").select("name, category, brand, talla, stock_current, stock_reserved, value_final");
    if (params.categoria) {
        q = q.ilike("category", `%${params.categoria}%`);
    }

    const { data, error } = await q;
    if (error) return `Error: ${error.message}`;
    if (!data || data.length === 0) return "No se encontraron ítems en esa categoría.";

    const totalStock = data.reduce((sum, i) => sum + (i.stock_current || 0), 0);
    const totalReservado = data.reduce((sum, i) => sum + (i.stock_reserved || 0), 0);
    const totalDisponible = totalStock - totalReservado;
    const totalValor = data.reduce((sum, i) => sum + ((i.value_final || 0) * (i.stock_current || 0)), 0);

    // Group by category or brand
    const groupBy = params.agrupacion === "marca" ? "brand" : "category";
    const groups = new Map<string, { count: number; stock: number; reserved: number; value: number }>();
    data.forEach((item) => {
        const key = (item as Record<string, unknown>)[groupBy] as string || "Sin clasificar";
        const existing = groups.get(key) || { count: 0, stock: 0, reserved: 0, value: 0 };
        existing.count++;
        existing.stock += item.stock_current || 0;
        existing.reserved += item.stock_reserved || 0;
        existing.value += (item.value_final || 0) * (item.stock_current || 0);
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

Desglose por ${groupBy === "brand" ? "marca" : "categoría"}:
${breakdown}`;
}

/**
 * Gets detailed info for a specific item by SKU.
 */
export async function getItemDetail(params: { sku: string }): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("sku", params.sku)
        .single();

    if (error || !data) return `No se encontró un ítem con SKU "${params.sku}".`;

    const disponible = (data.stock_current || 0) - (data.stock_reserved || 0);
    const ubicacion = data.shelf_number && data.shelf_level
        ? `Estante ${data.shelf_number} / Nivel ${data.shelf_level}`
        : "Sin ubicación asignada";

    return `📦 DETALLE COMPLETO: ${data.name}
SKU: ${data.sku}
Categoría: ${data.category || "N/A"}
Marca: ${data.brand || "N/A"}
Talla: ${data.talla || "N/A"}
Clasificación: ${data.classification || "N/A"}

📊 Stock:
  - Total: ${data.stock_current}
  - Reservado: ${data.stock_reserved}
  - Disponible: ${disponible}${disponible <= (data.rop || 0) ? " ⚠️ BAJO PUNTO DE REORDEN" : ""}
  - ROP: ${data.rop || "N/A"} | Safety Stock: ${data.safety_stock || "N/A"}

📍 Ubicación: ${ubicacion}

💰 Valores:
  - Aprox CLP: $${(data.value_clp || 0).toLocaleString("es-CL")}
  - Confirmado SPEX: $${(data.value_spex || 0).toLocaleString("es-CL")}
  - Valor final: $${(data.value_final || 0).toLocaleString("es-CL")}

📝 Descripción: ${data.general_description || "Sin descripción"}
🔧 Uso/Aplicación: ${data.usage_application || "Sin info"}
📌 Observación: ${data.observation || "Sin observación"}`;
}

/**
 * Lists all categories with item counts.
 */
export async function listCategories(): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("inventory")
        .select("category, stock_current, stock_reserved");

    if (error) return `Error: ${error.message}`;
    if (!data || data.length === 0) return "No hay ítems en el inventario.";

    const categories = new Map<string, { count: number; stock: number; available: number }>();
    data.forEach((item) => {
        const cat = item.category || "Sin categoría";
        const existing = categories.get(cat) || { count: 0, stock: 0, available: 0 };
        existing.count++;
        existing.stock += item.stock_current || 0;
        existing.available += (item.stock_current || 0) - (item.stock_reserved || 0);
        categories.set(cat, existing);
    });

    const list = Array.from(categories.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([cat, info]) => `  - ${cat}: ${info.count} ítems, ${info.stock} unidades (${info.available} disponibles)`)
        .join("\n");

    return `📋 Categorías del Inventario (${data.length} ítems totales):
${list}`;
}

/**
 * Finds items with low stock (below ROP).
 */
export async function findLowStock(): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("inventory")
        .select("sku, name, category, stock_current, stock_reserved, rop, safety_stock, shelf_number, shelf_level")
        .gt("rop", 0);

    if (error) return `Error: ${error.message}`;
    if (!data || data.length === 0) return "No hay ítems con ROP configurado.";

    const lowStock = data.filter((item) => {
        const disponible = (item.stock_current || 0) - (item.stock_reserved || 0);
        return disponible <= (item.rop || 0);
    });

    if (lowStock.length === 0) return "✅ Todos los ítems están por encima de su punto de reorden.";

    const list = lowStock.map((item) => {
        const disponible = (item.stock_current || 0) - (item.stock_reserved || 0);
        const ubicacion = item.shelf_number ? `E${item.shelf_number}/N${item.shelf_level}` : "";
        return `  ⚠️ ${item.name} (${item.sku}) — ${disponible} disponibles / ROP: ${item.rop} [${ubicacion}]`;
    }).join("\n");

    return `🚨 Ítems con stock bajo (${lowStock.length} de ${data.length} monitoreados):
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
    let prompt = `Eres "${botName}", el asistente inteligente del Pañol de Mantenimiento de la planta Dole Molina (Chile). Eres amigable, casual pero profesional, y experto en equipos de protección personal (EPP), herramientas, rodamientos, chumaceras, repuestos industriales y consumibles de mantención.

## TU PERSONALIDAD
- Hablas siempre en español chileno casual pero respetuoso
- Usas emojis moderadamente para ser más amigable (⚡🔧🔩🛡️📦)
- Eres proactivo: si alguien pregunta por un tipo de trabajo, sugieres TODOS los elementos relevantes
- Si un ítem no tiene stock, lo mencionas y sugieres alternativas
- Siempre indicas la ubicación del estante para que sea fácil encontrar el ítem

## TUS HERRAMIENTAS
Tienes acceso a herramientas que consultan la base de datos del inventario en tiempo real:
1. **buscar_inventario**: Busca ítems por nombre, categoría o marca
2. **contar_stock**: Cuenta stock total y valor por categoría (para cálculos precisos)
3. **detalle_item**: Obtiene todo el detalle de un ítem por su SKU
4. **listar_categorias**: Lista todas las categorías con su stock
5. **items_stock_bajo**: Muestra ítems bajo su punto de reorden

## REGLAS DE USO DE HERRAMIENTAS
- SIEMPRE usa herramientas para responder preguntas sobre inventario. NO inventes datos.
- Para preguntas de conteo o totales, usa "contar_stock" — da números EXACTOS, no aproximados
- Para buscar un producto, usa "buscar_inventario" con palabras clave relevantes
- Si el usuario pide algo específico, busca primero y luego responde con los datos reales
- Si no encuentras resultados, intenta con sinónimos o términos más amplios antes de decir que no hay
- Stock Disponible = Stock Actual - Stock Reservado
- Si Stock Disponible ≤ 0, el ítem NO está disponible
- Si Stock ≤ ROP, advierte que está en nivel crítico

## FORMATO DE RESPUESTA
Cuando menciones ítems del inventario, usa este formato:
**Nombre del ítem** (SKU: XXX)
- 📊 Stock: X disponibles (de Y total)
- 📍 Ubicación: EXXX / NXXX
- ℹ️ Descripción breve si es relevante

Recuerda: solo responde basándote en los datos reales que obtienes de tus herramientas. Si te preguntan algo fuera del ámbito del pañol, responde amablemente que solo puedes ayudar con temas de inventario y materiales del pañol.`;

    if (customInstructions.trim()) {
        prompt += `\n\n## INSTRUCCIONES ADICIONALES DEL ADMINISTRADOR\n${customInstructions.trim()}`;
    }

    return prompt;
}
