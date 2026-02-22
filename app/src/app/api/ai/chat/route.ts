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
        const { conversationId, message } = body;

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
        const botName = config.ai_bot_name || "Chispita";
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
                conversationMessages
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
 * Calls Gemini API with function calling support.
 * Implements a tool loop: if Gemini requests a function call,
 * we execute it and feed the result back until Gemini produces text.
 */
async function callGeminiWithTools(
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    // Convert messages to Gemini format
    const geminiContents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));

    const MAX_TOOL_ROUNDS = 5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentContents: any[] = [...geminiContents];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
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
                console.log(`[AI Tool] Executing: ${name}(${JSON.stringify(args)})`);

                const result = await executeToolCall(name, args || {});

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
        return textParts.map((p: { text: string }) => p.text).join("") || "No pude generar una respuesta.";
    }

    return "Se alcanzó el límite de consultas internas. Por favor, intenta reformular tu pregunta.";
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
