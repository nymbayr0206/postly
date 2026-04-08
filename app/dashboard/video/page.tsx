import { redirect } from "next/navigation";

import { VideoGeneratorClient } from "@/components/dashboard/video-generator-client";
import { getActiveVideoModelNames } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getEffectiveTariffForProfile,
  getModels,
  getPlatformSettings,
  getUserProfile,
  getWallet,
} from "@/lib/user-data";
import { getVideoModelCatalogOrThrow } from "@/lib/video-models/catalog";

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

  const activeVideoModelNames = getActiveVideoModelNames();
  const [profile, wallet, platformSettings, allModels, { data: history }] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    getPlatformSettings(supabase),
    getModels(supabase),
    supabase
      .from("video_generations")
      .select("id,prompt,video_url,image_url,duration,quality,cost,created_at,model_name,seed,provider_task_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const modelByName = new Map(allModels.map((model) => [model.name, model]));
  const videoModels = activeVideoModelNames.map((modelName) => {
    const catalog = getVideoModelCatalogOrThrow(modelName);
    const dbModel = modelByName.get(modelName);

    return {
      name: catalog.name,
      label: catalog.label,
      description: catalog.description,
      durationOptions: [...catalog.durationOptions],
      qualityOptions: [...catalog.qualityOptions],
      defaultDuration: catalog.defaultDuration,
      defaultQuality: catalog.defaultQuality,
      baseCost: dbModel?.base_cost ?? catalog.defaultBaseCost,
    };
  });

  const items = (history ?? []).map((item) => ({
    ...item,
    can_extend: Boolean(item.provider_task_id && item.model_name.startsWith("veo")),
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
          tariffMultiplier={tariff.multiplier}
          models={videoModels}
        />
      </section>
    </div>
  );
}
