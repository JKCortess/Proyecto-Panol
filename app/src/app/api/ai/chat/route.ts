import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildSystemPrompt, AI_TOOLS, executeToolCall } from "@/lib/ai-data";

/**
 * POST /api/ai/chat
 * Main chat endpoint with function calling support.
 * Uses Gemini's tool/function calling to execute SQL queries.
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = await req.json();
        const { conversationId, message, attachments } = body;

        if (!message || !conversationId) {
            return NextResponse.json(
                { error: "Mensaje y conversationId son requeridos" },
                { status: 400 }
            );
        }

        // Fetch AI config from app_settings
        const { data: settings } = await supabase
            .from("app_settings")
            .select("key, value")
            .in("key", [
                "ai_provider",
                "ai_api_key",
                "ai_model",
                "ai_bot_name",
                "ai_openrouter_key",
                "ai_system_prompt",
            ]);

        const config: Record<string, string> = {};
        settings?.forEach((s: { key: string; value: string }) => {
            config[s.key] = s.value;
        });

        const provider = config.ai_provider || "gemini";
        const apiKey =
            provider === "openrouter"
                ? config.ai_openrouter_key
                : config.ai_api_key;
        const model = config.ai_model || "gemini-2.5-flash";
        const botName = config.ai_bot_name || "Asistente";
        const customPrompt = config.ai_system_prompt || "";

        if (!apiKey) {
            return NextResponse.json(
                {
                    error: `No hay API Key configurada para ${provider}. Un administrador debe configurarla en Configuración Avanzada > Asistente IA.`,
                },
                { status: 503 }
            );
        }

        // Save user message to database
        await supabase.from("ai_messages").insert({
            conversation_id: conversationId,
            role: "user",
            content: message,
        });

        // Load conversation history (last 20 messages for context window)
        const { data: historyMessages } = await supabase
            .from("ai_messages")
            .select("role, content")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(20);

        // Build system prompt (no longer includes inventory dump)
        const systemPrompt = buildSystemPrompt(botName, customPrompt);

        // Build messages array
        const conversationMessages = (historyMessages || []).map(
            (m: { role: string; content: string }) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })
        );

        // Call AI with function calling support
        let responseText: string;
        if (provider === "gemini") {
            responseText = await callGeminiWithTools(
                apiKey,
                model,
                systemPrompt,
                conversationMessages,
                attachments
            );
        } else {
            responseText = await callOpenRouterSimple(
                apiKey,
                model,
                systemPrompt,
                conversationMessages
            );
        }

        // Save assistant response to database
        if (responseText.trim()) {
            await supabase.from("ai_messages").insert({
                conversation_id: conversationId,
                role: "assistant",
                content: responseText.trim(),
            });

            // Update conversation title if this is the first exchange
            const { count } = await supabase
                .from("ai_messages")
                .select("id", { count: "exact", head: true })
                .eq("conversation_id", conversationId);

            if (!count || count <= 2) {
                const title =
                    message.length > 60
                        ? message.substring(0, 57) + "..."
                        : message;
                await supabase
                    .from("ai_conversations")
                    .update({
                        title,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", conversationId);
            } else {
                await supabase
                    .from("ai_conversations")
                    .update({
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", conversationId);
            }
        }

        // Return response as stream-compatible text
        return new Response(responseText, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        console.error("[AI Chat] Error:", error);
        const message =
            error instanceof Error ? error.message : "Error interno del servidor";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Truncates a tool result string to avoid blowing up the context window.
 * Keeps the first MAX_CHARS characters and appends a truncation notice.
 */
function truncateToolResult(result: string, maxChars: number = 4000): string {
    if (result.length <= maxChars) return result;
    const truncated = result.substring(0, maxChars);
    // Try to cut at a clean line break
    const lastNewline = truncated.lastIndexOf("\n");
    const cutPoint = lastNewline > maxChars * 0.7 ? lastNewline : maxChars;
    return truncated.substring(0, cutPoint) + "\n...[Resultado truncado. Se mostraron los primeros resultados relevantes.]";
}

/**
 * Compacts older tool call rounds into a brief summary to free context space.
 * Keeps the original conversation messages and the last `keepRecent` tool rounds intact.
 * Earlier tool rounds are replaced with a concise text summary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compactToolHistory(contents: any[], originalMessageCount: number, keepRecent: number = 4): any[] {
    // Tool rounds start after original messages. Each round = 2 entries (model + user/functionResponse)
    const toolEntries = contents.slice(originalMessageCount);
    const totalToolPairs = Math.floor(toolEntries.length / 2);

    // Only compact if we have more tool pairs than keepRecent
    if (totalToolPairs <= keepRecent) return contents;

    const pairsToCompact = totalToolPairs - keepRecent;
    const entriesToCompact = pairsToCompact * 2; // Each pair = model response + function results

    // Build a summary of the compacted rounds
    const summaryLines: string[] = [];
    for (let i = 0; i < entriesToCompact; i += 2) {
        const modelEntry = toolEntries[i];
        const resultEntry = toolEntries[i + 1];

        // Extract function call names from the model entry
        const callNames = (modelEntry?.parts || [])
            .filter((p: { functionCall?: { name: string } }) => p.functionCall)
            .map((p: { functionCall: { name: string } }) => p.functionCall.name);

        // Extract a brief snippet from each function response
        const resultSnippets = (resultEntry?.parts || [])
            .filter((p: { functionResponse?: unknown }) => p.functionResponse)
            .map((p: { functionResponse: { name: string; response: { result: string } } }) => {
                const res = p.functionResponse.response?.result || "";
                // Keep first 200 chars of each result as summary
                const snippet = res.length > 200 ? res.substring(0, 200) + "..." : res;
                return `${p.functionResponse.name}: ${snippet}`;
            });

        summaryLines.push(`Consulta ${Math.floor(i / 2) + 1}: [${callNames.join(", ")}] → ${resultSnippets.join(" | ")}`);
    }

    const summaryText = `[Resumen de consultas anteriores al inventario]\n${summaryLines.join("\n")}`;

    // Rebuild: original messages + summary + recent tool rounds
    const recentToolEntries = toolEntries.slice(entriesToCompact);
    return [
        ...contents.slice(0, originalMessageCount),
        { role: "user", parts: [{ text: summaryText }] },
        { role: "model", parts: [{ text: "Entendido. Tengo el contexto de las consultas anteriores. Continúo analizando." }] },
        ...recentToolEntries,
    ];
}

/**
 * Calls Gemini API with function calling support.
 * Implements a tool loop: if Gemini requests a function call,
 * we execute it and feed the result back until Gemini produces text.
 *
 * Context management strategy:
 * - Tool results are truncated to ~4000 chars to prevent context bloat.
 * - After round 7, older tool rounds are compacted into a brief summary,
 *   keeping the last 4 rounds at full fidelity for the model to reason over.
 * - This allows up to 15 tool rounds without exhausting the context window.
 */
async function callGeminiWithTools(
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: { role: string; content: string }[],
    attachments?: { base64: string; mimeType: string; fileName: string }[]
): Promise<string> {
    // Convert messages to Gemini format
    const geminiContents = messages.map((m, idx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [{ text: m.content }];

        // Attach files to the last user message
        if (attachments && attachments.length > 0 && m.role === "user" && idx === messages.length - 1) {
            for (const att of attachments) {
                parts.push({
                    inlineData: {
                        mimeType: att.mimeType,
                        data: att.base64,
                    },
                });
            }
        }

        return {
            role: m.role === "assistant" ? "model" : "user",
            parts,
        };
    });

    const MAX_TOOL_ROUNDS = 15;
    const COMPACT_AFTER_ROUND = 7; // Start compacting older rounds after this
    const originalMessageCount = geminiContents.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentContents: any[] = [...geminiContents];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        // Progressive compaction: after COMPACT_AFTER_ROUND, summarize old tool rounds
        if (round >= COMPACT_AFTER_ROUND) {
            currentContents = compactToolHistory(currentContents, originalMessageCount, 4);
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemPrompt }],
                    },
                    contents: currentContents,
                    tools: AI_TOOLS,
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        maxOutputTokens: 4096,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Gemini] API Error:", response.status, errorText);
            if (response.status === 429 || response.status === 403) {
                throw new Error(
                    "Se agotaron los créditos de la API de Gemini o la API Key es inválida."
                );
            }
            throw new Error(`Error de API Gemini: ${response.status}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (!candidate?.content?.parts) {
            throw new Error("Respuesta vacía de Gemini");
        }

        const parts = candidate.content.parts;

        // Check if there are function calls
        const functionCalls = parts.filter(
            (p: { functionCall?: unknown }) => p.functionCall
        );

        if (functionCalls.length > 0) {
            // Add model's response to the conversation
            currentContents.push({
                role: "model",
                parts: parts,
            });

            // Execute each function call and build responses
            const functionResponses = [];
            for (const fc of functionCalls) {
                const { name, args } = fc.functionCall;
                console.log(`[AI Tool] Round ${round + 1}/${MAX_TOOL_ROUNDS} — Executing: ${name}(${JSON.stringify(args)})`);

                const rawResult = await executeToolCall(name, args || {});
                // Truncate large results to preserve context window
                const result = truncateToolResult(rawResult);

                if (rawResult.length !== result.length) {
                    console.log(`[AI Tool] Result truncated: ${rawResult.length} → ${result.length} chars`);
                }

                functionResponses.push({
                    functionResponse: {
                        name: name,
                        response: { result },
                    },
                });
            }

            // Add function results back to conversation
            currentContents.push({
                role: "user",
                parts: functionResponses,
            });

            // Continue the loop — Gemini will now generate text using the tool results
            continue;
        }

        // No function calls — extract text response
        const textParts = parts.filter((p: { text?: string }) => p.text);
        console.log(`[AI Tool] Completed in ${round + 1} round(s)`);
        return textParts.map((p: { text: string }) => p.text).join("") || "No pude generar una respuesta.";
    }

    console.warn(`[AI Tool] Hit MAX_TOOL_ROUNDS (${MAX_TOOL_ROUNDS})`);
    return "He realizado muchas consultas internas para responder tu pregunta. Por favor, intenta hacer una pregunta más específica o dividirla en partes más pequeñas.";
}

/**
 * Fallback for OpenRouter (no function calling support).
 * Uses the old text-dump approach for non-Gemini providers.
 */
async function callOpenRouterSimple(
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    const openRouterMessages = [
        { role: "system", content: systemPrompt + "\n\nNOTA: No tienes acceso a herramientas SQL en este modo. Responde basándote en tu conocimiento general y sugiere al usuario sincronizar datos si necesitan info precisa." },
        ...messages,
    ];

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://panol-dole.vercel.app",
                "X-Title": "Pañol Dole Molina - Asistente IA",
            },
            body: JSON.stringify({
                model,
                messages: openRouterMessages,
                temperature: 0.7,
                max_tokens: 4096,
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[OpenRouter] API Error:", response.status, errorText);
        throw new Error(`Error de API OpenRouter: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No pude generar una respuesta.";
}
