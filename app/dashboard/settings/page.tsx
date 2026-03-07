import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/user-data";
import { SettingsClient } from "@/components/dashboard/settings-client";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const profile = await getUserProfile(supabase, user.id);
  return <SettingsClient email={profile.email} />;
}
