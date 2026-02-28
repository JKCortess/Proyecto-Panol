import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isCurrentUserAdmin } from "@/app/(app)/profile/actions";

/**
 * GET /api/ai/openrouter-models
 * Returns all saved OpenRouter models. Any authenticated user can read.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("openrouter_saved_models")
            .select("id, model_id, label, created_at")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("[OpenRouter Models] Error:", error);
            return NextResponse.json({ error: "Error al obtener modelos" }, { status: 500 });
        }

        return NextResponse.json({ models: data || [] });
    } catch (error) {
        console.error("[OpenRouter Models] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * POST /api/ai/openrouter-models
 * Saves a new OpenRouter model. Admin only.
 * Body: { model_id: string, label?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: "Solo administradores pueden guardar modelos" }, { status: 403 });
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { model_id, label } = await req.json();

        if (!model_id || typeof model_id !== "string" || !model_id.trim()) {
            return NextResponse.json({ error: "Se requiere el model_id" }, { status: 400 });
        }

        // Check for duplicates
        const { data: existing } = await supabase
            .from("openrouter_saved_models")
            .select("id")
            .eq("model_id", model_id.trim())
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "Este modelo ya está guardado" }, { status: 409 });
        }

        const { data, error } = await supabase
            .from("openrouter_saved_models")
            .insert({
                model_id: model_id.trim(),
                label: label?.trim() || null,
                created_by: user?.id || null,
            })
            .select("id, model_id, label, created_at")
            .single();

        if (error) {
            console.error("[OpenRouter Models] Insert error:", error);
            return NextResponse.json({ error: "Error al guardar modelo" }, { status: 500 });
        }

        return NextResponse.json({ model: data, message: "Modelo guardado" });
    } catch (error) {
        console.error("[OpenRouter Models] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * DELETE /api/ai/openrouter-models?id=<uuid>
 * Deletes a saved OpenRouter model. Admin only.
 */
export async function DELETE(req: NextRequest) {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: "Solo administradores pueden eliminar modelos" }, { status: 403 });
        }

        const supabase = await createClient();
        const id = req.nextUrl.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Se requiere el ID del modelo" }, { status: 400 });
        }

        const { error } = await supabase
            .from("openrouter_saved_models")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("[OpenRouter Models] Delete error:", error);
            return NextResponse.json({ error: "Error al eliminar modelo" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Modelo eliminado" });
    } catch (error) {
        console.error("[OpenRouter Models] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
