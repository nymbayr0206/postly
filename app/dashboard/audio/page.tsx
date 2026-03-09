import { redirect } from "next/navigation";

import { AudioGeneratorClient } from "@/components/dashboard/audio-generator-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformSettings, getWallet } from "@/lib/user-data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AudioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const [wallet, platformSettings, { data: history }] = await Promise.all([
    getWallet(supabase, user.id),
    getPlatformSettings(supabase),
    supabase
      .from("audio_generations")
      .select("id,prompt,audio_url,model_name,cost,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const items = (history ?? []).map((item) => ({
    ...item,
    created_at_label: formatDate(item.created_at),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-surface overflow-hidden rounded-[2rem]">
        <AudioGeneratorClient
          currentCredits={wallet.credits}
          history={items}
          creditPriceMnt={platformSettings.credit_price_mnt}
        />
      </section>
    </div>
  );
}
