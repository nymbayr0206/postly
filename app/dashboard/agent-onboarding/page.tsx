import { redirect } from "next/navigation";

import { AgentOnboardingPanel } from "@/components/dashboard/agent-onboarding-panel";
import { AGENT_APPROVAL_CREDITS, AGENT_SIGNUP_PRICE_MNT } from "@/lib/agent-config";
import { getAdminBankDetails } from "@/lib/payment-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecords, getAgentRequestByUserId, getUserProfile } from "@/lib/user-data";

export default async function AgentOnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserRecords(supabase, user);

  const [profile, request] = await Promise.all([
    getUserProfile(supabase, user.id),
    getAgentRequestByUserId(supabase, user.id),
  ]);

  return (
    <AgentOnboardingPanel
      role={profile.role}
      request={request}
      bankDetails={getAdminBankDetails()}
      priceMnt={AGENT_SIGNUP_PRICE_MNT}
      bonusCredits={AGENT_APPROVAL_CREDITS}
    />
  );
}
