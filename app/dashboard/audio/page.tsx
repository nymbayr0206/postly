import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWallet } from "@/lib/user-data";
import { AudioGeneratorClient } from "@/components/dashboard/audio-generator-client";

export default async function AudioPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const [wallet, { data: history }] = await Promise.all([
    getWallet(supabase, user.id),
    supabase
      .from("audio_generations")
      .select("id,prompt,audio_url,model_name,cost,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return <AudioGeneratorClient currentCredits={wallet.credits} history={history ?? []} />;
}
