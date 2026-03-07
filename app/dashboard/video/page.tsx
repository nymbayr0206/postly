import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWallet } from "@/lib/user-data";
import { VideoGeneratorClient } from "@/components/dashboard/video-generator-client";

export default async function VideoPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const [wallet, { data: history }] = await Promise.all([
    getWallet(supabase, user.id),
    supabase
      .from("video_generations")
      .select("id,prompt,video_url,image_url,duration,quality,cost,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return <VideoGeneratorClient currentCredits={wallet.credits} history={history ?? []} />;
}
