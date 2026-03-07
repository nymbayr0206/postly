import { redirect } from "next/navigation";

import DashboardLayoutShell from "@/components/dashboard/dashboard-layout-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureUserRecords,
  getAgentRequestByUserId,
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

  const [profile, wallet, agentRequest] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    getAgentRequestByUserId(supabase, user.id),
  ]);

  return (
    <DashboardLayoutShell
      credits={wallet.credits}
      email={profile.email}
      role={profile.role}
      showAgentOnboarding={profile.role !== "agent" && Boolean(agentRequest)}
      showLessons={profile.role === "agent"}
    >
      {children}
    </DashboardLayoutShell>
  );
}
