import { redirect } from "next/navigation";

import { ImageGeneratorClient } from "@/components/dashboard/image-generator-client";
import { getActiveModelNames } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getEffectiveTariffForProfile,
  getModelByName,
  getPlatformSettings,
  getUserProfile,
  getWallet,
} from "@/lib/user-data";

export default async function ImagePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { nanoBananaModelName } = getActiveModelNames();
  const [profile, wallet, platformSettings, model] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    getPlatformSettings(supabase),
    getModelByName(supabase, nanoBananaModelName),
  ]);
  const tariff = await getEffectiveTariffForProfile(supabase, profile);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-surface overflow-hidden rounded-[2rem]">
        <ImageGeneratorClient
          currentCredits={wallet.credits}
          creditPriceMnt={platformSettings.credit_price_mnt}
          modelBaseCost={model.base_cost}
          tariffMultiplier={tariff.multiplier}
        />
      </section>
    </div>
  );
}
