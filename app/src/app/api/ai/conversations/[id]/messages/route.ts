import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/ai/conversations/[id]/messages
 * Returns all messages for a conversation.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id } = await params;

        // RLS ensures only messages from user's conversations are returned
        const { data, error } = await supabase
            .from("ai_messages")
            .select("id, role, content, created_at")
            .eq("conversation_id", id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("[Messages] Error:", error);
            return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 });
        }

        return NextResponse.json({ messages: data || [] });
    } catch (error) {
        console.error("[Messages] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
