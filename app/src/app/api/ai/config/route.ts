import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isCurrentUserAdmin } from "@/app/profile/actions";

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
