import { getUserProfile } from "@/app/profile/actions";
import { createClient } from "@/utils/supabase/server";
import AssistantClient from "./AssistantClient";

async function getBotName(): Promise<string> {
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "ai_bot_name")
            .single();
        return data?.value || "Asistente";
    } catch {
        return "Asistente";
    }
}

export default async function AssistantPage() {
    const [profile, botName] = await Promise.all([
        getUserProfile(),
        getBotName(),
    ]);
    return (
        <AssistantClient
            userAvatarId={profile?.avatar_id || null}
            initialBotName={botName}
        />
    );
}
