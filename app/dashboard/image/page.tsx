import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWallet } from "@/lib/user-data";
import { ImageGeneratorClient } from "@/components/dashboard/image-generator-client";

export default async function ImagePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const wallet = await getWallet(supabase, user.id);
  return <ImageGeneratorClient currentCredits={wallet.credits} />;
}
