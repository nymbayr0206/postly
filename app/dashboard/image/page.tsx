import { redirect } from "next/navigation";

import { ImageGeneratorClient } from "@/components/dashboard/image-generator-client";
import { getActiveModelNames } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGenerationPricingPreview, getUserProfile, getWallet } from "@/lib/user-data";

export default async function ImagePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const [profile, wallet] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
  ]);
  const { nanoBananaModelName } = getActiveModelNames();
  const pricing = await getGenerationPricingPreview(
    supabase,
    profile,
    nanoBananaModelName,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-surface overflow-hidden rounded-[2rem]">
        <ImageGeneratorClient currentCredits={wallet.credits} pricing={pricing} />
      </section>
    </div>
  );
}
