import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isCurrentUserAdmin } from "@/app/(app)/profile/actions";

/**
 * GET /api/ai/api-keys
 * Lists all stored API keys (with masked values) for the current user.
 */
export async function GET() {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const supabase = await createClient();

        // Get the current active key from app_settings
        const { data: currentSetting } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "ai_api_key")
            .single();

        const activeKey = currentSetting?.value || "";

        // Get all stored keys
        const { data: keys, error } = await supabase
            .from("ai_api_keys")
            .select("id, label, key_preview, api_key, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            // Table might not exist yet — return empty array
            console.error("[AI API Keys] Error:", error);
            return NextResponse.json({ keys: [], activeKeyPreview: maskKey(activeKey) });
        }

        // Mark which key is currently active
        const keysWithStatus = (keys || []).map((k) => ({
            id: k.id,
            label: k.label,
            key_preview: k.key_preview,
            is_active: k.api_key === activeKey,
        }));

        return NextResponse.json({ keys: keysWithStatus });
    } catch (error) {
        console.error("[AI API Keys] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * POST /api/ai/api-keys
 * Stores a new API key and sets it as the active key.
 */
export async function POST(req: NextRequest) {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { apiKey, label } = await req.json();

        if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
            return NextResponse.json(
                { error: "API Key inválida" },
                { status: 400 }
            );
        }

        const keyLabel = label?.trim() || `Key ${new Date().toLocaleDateString("es-CL")}`;
        const keyPreview = apiKey.slice(0, 6) + "••••••••" + apiKey.slice(-4);

        // Store the key in ai_api_keys table
        const { error: insertError } = await supabase.from("ai_api_keys").insert({
            api_key: apiKey.trim(),
            label: keyLabel,
            key_preview: keyPreview,
            created_by: user?.id,
        });

        if (insertError) {
            console.error("[AI API Keys] Insert error:", insertError);
            return NextResponse.json(
                { error: "Error al guardar la key. " + insertError.message },
                { status: 500 }
            );
        }

        // Set as the active API key in app_settings
        const { error: updateError } = await supabase
            .from("app_settings")
            .update({
                value: apiKey.trim(),
                updated_by: user?.id,
                updated_at: new Date().toISOString(),
            })
            .eq("key", "ai_api_key");

        if (updateError) {
            console.error("[AI API Keys] Update settings error:", updateError);
            return NextResponse.json(
                { error: "Key guardada pero no se pudo activar" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `API Key "${keyLabel}" guardada y activada`,
        });
    } catch (error) {
        console.error("[AI API Keys] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * PATCH /api/ai/api-keys
 * Activates an existing stored API key by its ID.
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

        const { keyId } = await req.json();

        if (!keyId) {
            return NextResponse.json({ error: "Se requiere keyId" }, { status: 400 });
        }

        // Get the full key value
        const { data: keyData, error: fetchError } = await supabase
            .from("ai_api_keys")
            .select("api_key, label")
            .eq("id", keyId)
            .single();

        if (fetchError || !keyData) {
            return NextResponse.json({ error: "Key no encontrada" }, { status: 404 });
        }

        // Set as active in app_settings
        const { error: updateError } = await supabase
            .from("app_settings")
            .update({
                value: keyData.api_key,
                updated_by: user?.id,
                updated_at: new Date().toISOString(),
            })
            .eq("key", "ai_api_key");

        if (updateError) {
            return NextResponse.json(
                { error: "Error al activar la key" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `API Key "${keyData.label}" activada`,
        });
    } catch (error) {
        console.error("[AI API Keys] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

function maskKey(key: string): string {
    if (!key) return "";
    if (key.length <= 10) return "••••••••";
    return key.slice(0, 6) + "••••••••" + key.slice(-4);
}
