import { redirect } from "next/navigation";

import { VideoGeneratorClient } from "@/components/dashboard/video-generator-client";
import { getActiveModelNames } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getEffectiveTariffForProfile,
  getModelByName,
  getPlatformSettings,
  getUserProfile,
  getWallet,
} from "@/lib/user-data";

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

  const { runwayModelName } = getActiveModelNames();
  const [profile, wallet, platformSettings, model, { data: history }] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    getPlatformSettings(supabase),
    getModelByName(supabase, runwayModelName),
    supabase
      .from("video_generations")
      .select("id,prompt,video_url,image_url,duration,quality,cost,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const items = (history ?? []).map((item) => ({
    ...item,
    created_at_label: formatDate(item.created_at),
  }));
  const tariff = await getEffectiveTariffForProfile(supabase, profile);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-surface overflow-hidden rounded-[2rem]">
        <VideoGeneratorClient
          currentCredits={wallet.credits}
          history={items}
          creditPriceMnt={platformSettings.credit_price_mnt}
          modelBaseCost={model.base_cost}
          tariffMultiplier={tariff.multiplier}
        />
      </section>
    </div>
  );
}
