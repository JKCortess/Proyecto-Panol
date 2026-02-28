import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isCurrentUserAdmin } from "@/app/(app)/profile/actions";

/**
 * GET /api/ai/config
 * Returns AI configuration (admin only).
 */
export async function GET() {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from("app_settings")
            .select("key, value, description")
            .in("key", [
                "ai_provider",
                "ai_api_key",
                "ai_model",
                "ai_bot_name",
                "ai_openrouter_key",
                "ai_system_prompt",
            ]);

        if (error) {
            console.error("[AI Config] Error:", error);
            return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
        }

        const config: Record<string, string> = {};
        data?.forEach((s) => {
            config[s.key] = s.value;
        });

        return NextResponse.json({ config });
    } catch (error) {
        console.error("[AI Config] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * PUT /api/ai/config
 * Updates AI configuration (admin only).
 */
export async function PUT(req: NextRequest) {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const body = await req.json();
        const allowedKeys = [
            "ai_provider",
            "ai_api_key",
            "ai_model",
            "ai_bot_name",
            "ai_openrouter_key",
            "ai_system_prompt",
        ];

        const updates: { key: string; value: string }[] = [];
        for (const [key, value] of Object.entries(body)) {
            if (allowedKeys.includes(key) && typeof value === "string") {
                updates.push({ key, value });
            }
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: "No hay cambios válidos" }, { status: 400 });
        }

        // Update each setting
        for (const update of updates) {
            const { error } = await supabase
                .from("app_settings")
                .update({
                    value: update.value,
                    updated_by: user?.id || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("key", update.key);

            if (error) {
                console.error(`[AI Config] Error updating ${update.key}:`, error);
                return NextResponse.json(
                    { error: `Error al actualizar ${update.key}` },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: "Configuración de IA actualizada correctamente",
        });
    } catch (error) {
        console.error("[AI Config] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * PATCH /api/ai/config
 * Quick model switch — any authenticated user can change the active model.
 * This is intentionally less restrictive than PUT (admin-only) since
 * switching models is an operational action needed when credits run out.
 */
export async function PATCH(req: NextRequest) {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { model, provider } = await req.json();

        if (!model || typeof model !== "string") {
            return NextResponse.json(
                { error: "Se requiere el nombre del modelo" },
                { status: 400 }
            );
        }

        // Update model
        const { error } = await supabase
            .from("app_settings")
            .update({
                value: model,
                updated_by: user?.id,
                updated_at: new Date().toISOString(),
            })
            .eq("key", "ai_model");

        if (error) {
            console.error("[AI Config] Error updating model:", error);
            return NextResponse.json(
                { error: "Error al cambiar el modelo" },
                { status: 500 }
            );
        }

        // Update provider if specified
        if (provider && typeof provider === "string" && ["gemini", "openrouter"].includes(provider)) {
            const { error: providerError } = await supabase
                .from("app_settings")
                .update({
                    value: provider,
                    updated_by: user?.id,
                    updated_at: new Date().toISOString(),
                })
                .eq("key", "ai_provider");

            if (providerError) {
                console.error("[AI Config] Error updating provider:", providerError);
            }
        }

        return NextResponse.json({
            success: true,
            model,
            provider: provider || undefined,
            message: `Modelo cambiado a ${model}`,
        });
    } catch (error) {
        console.error("[AI Config] PATCH Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
