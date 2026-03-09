import { redirect } from "next/navigation";

import { ImageGeneratorClient } from "@/components/dashboard/image-generator-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWallet } from "@/lib/user-data";

export default async function ImagePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const wallet = await getWallet(supabase, user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="brand-surface overflow-hidden rounded-[2rem]">
        <ImageGeneratorClient currentCredits={wallet.credits} />
      </section>
    </div>
  );
}
