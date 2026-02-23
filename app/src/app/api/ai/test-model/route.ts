import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * POST /api/ai/test-model
 * Tests if a specific Gemini model is available by sending a minimal "ping".
 * Returns availability status and latency.
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

        const { model } = await req.json();

        if (!model || typeof model !== "string") {
            return NextResponse.json(
                { error: "Se requiere el nombre del modelo" },
                { status: 400 }
            );
        }

        // Get Gemini API key from settings
        const { data: settings } = await supabase
            .from("app_settings")
            .select("key, value")
            .eq("key", "ai_api_key")
            .single();

        const apiKey = settings?.value;

        if (!apiKey) {
            return NextResponse.json(
                { available: false, error: "No hay API Key de Gemini configurada" },
                { status: 200 }
            );
        }

        // Send minimal ping to model
        const startTime = Date.now();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [{ text: "Responde solo: OK" }],
                            },
                        ],
                        generationConfig: {
                            temperature: 0,
                            maxOutputTokens: 5,
                        },
                    }),
                    signal: controller.signal,
                }
            );

            clearTimeout(timeout);
            const latency = Date.now() - startTime;

            if (response.ok) {
                return NextResponse.json({
                    available: true,
                    latency,
                    model,
                });
            }

            // Parse error
            const errorData = await response.text();
            let errorMessage = `HTTP ${response.status}`;

            if (response.status === 429) {
                errorMessage = "Cuota agotada (429)";
            } else if (response.status === 403) {
                errorMessage = "API Key inválida o sin permisos (403)";
            } else if (response.status === 404) {
                errorMessage = "Modelo no encontrado (404)";
            } else {
                try {
                    const parsed = JSON.parse(errorData);
                    errorMessage = parsed.error?.message || errorMessage;
                } catch {
                    // keep default
                }
            }

            return NextResponse.json({
                available: false,
                error: errorMessage,
                model,
                latency,
            });
        } catch (fetchError) {
            clearTimeout(timeout);
            const latency = Date.now() - startTime;

            if (fetchError instanceof Error && fetchError.name === "AbortError") {
                return NextResponse.json({
                    available: false,
                    error: "Timeout (>8s)",
                    model,
                    latency,
                });
            }

            return NextResponse.json({
                available: false,
                error: "Error de conexión",
                model,
                latency,
            });
        }
    } catch (error) {
        console.error("[Test Model] Error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
