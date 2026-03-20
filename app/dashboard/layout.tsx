import { redirect } from "next/navigation";

import DashboardLayoutShell from "@/components/dashboard/dashboard-layout-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureUserRecords,
  getAgentRequestByUserId,
  getPlatformSettings,
  getUserProfile,
  getWallet,
} from "@/lib/user-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserRecords(supabase, user);

  const [profile, wallet, agentRequest, platformSettings] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    getAgentRequestByUserId(supabase, user.id),
    getPlatformSettings(supabase),
  ]);

  return (
    <DashboardLayoutShell
      credits={wallet.credits}
      creditPriceMnt={platformSettings.credit_price_mnt}
      email={profile.email}
      role={profile.role}
      showAgentOnboarding={profile.role !== "agent" && Boolean(agentRequest)}
      showLessons={profile.role !== "admin"}
    >
      {children}
    </DashboardLayoutShell>
  );
}
