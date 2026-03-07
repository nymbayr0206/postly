import { redirect } from "next/navigation";

import { VideoGeneratorClient } from "@/components/dashboard/video-generator-client";
import { getServerEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGenerationPricingPreview, getUserProfile, getWallet } from "@/lib/user-data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function VideoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const [profile, wallet, { data: history }] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    supabase
      .from("video_generations")
      .select("id,prompt,video_url,image_url,duration,quality,cost,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const pricing = await getGenerationPricingPreview(
    supabase,
    profile,
    getServerEnv().runwayModelName,
  );

  const items = (history ?? []).map((item) => ({
    ...item,
    created_at_label: formatDate(item.created_at),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-surface overflow-hidden rounded-[2rem]">
        <VideoGeneratorClient currentCredits={wallet.credits} history={items} pricing={pricing} />
      </section>
    </div>
  );
}
