import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/ai/conversations
 * Lists all conversations for the authenticated user.
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
            .from("ai_conversations")
            .select("id, title, created_at, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("[Conversations] Error:", error);
            return NextResponse.json({ error: "Error al obtener conversaciones" }, { status: 500 });
        }

        return NextResponse.json({ conversations: data || [] });
    } catch (error) {
        console.error("[Conversations] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * POST /api/ai/conversations
 * Creates a new conversation.
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("ai_conversations")
            .insert({
                user_id: user.id,
                title: "Nueva conversación",
            })
            .select("id, title, created_at, updated_at")
            .single();

        if (error) {
            console.error("[Conversations] Error creating:", error);
            return NextResponse.json({ error: "Error al crear conversación" }, { status: 500 });
        }

        return NextResponse.json({ conversation: data });
    } catch (error) {
        console.error("[Conversations] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

/**
 * DELETE /api/ai/conversations?id=uuid
 * Deletes a conversation and all its messages.
 */
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID de conversación requerido" }, { status: 400 });
        }

        // RLS ensures users can only delete their own conversations
        // CASCADE on ai_messages will clean up messages automatically
        const { error } = await supabase
            .from("ai_conversations")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            console.error("[Conversations] Error deleting:", error);
            return NextResponse.json({ error: "Error al eliminar conversación" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Conversations] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
