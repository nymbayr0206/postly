import { AdminUsersClient, type AdminUserSummary } from "@/components/admin/AdminUsersClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRow, WalletRow } from "@/lib/types";

type GenerationOwnerRow = {
  user_id: string;
};

function buildGenerationCountMap(rows: GenerationOwnerRow[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  return counts;
}

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();
  const [
    usersResponse,
    walletsResponse,
    imageGenerationsResponse,
    audioGenerationsResponse,
    videoGenerationsResponse,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id,email,role,tariff_id,full_name,phone_number,facebook_page_url,referral_code,referred_by_user_id,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("wallets").select("id,user_id,credits,created_at"),
    supabase.from("generations").select("user_id"),
    supabase.from("audio_generations").select("user_id"),
    supabase.from("video_generations").select("user_id"),
  ]);

  if (
    usersResponse.error ||
    walletsResponse.error ||
    imageGenerationsResponse.error ||
    audioGenerationsResponse.error ||
    videoGenerationsResponse.error
  ) {
    throw new Error("Хэрэглэгчдийн CRM мэдээллийг ачаалж чадсангүй.");
  }

  const users = (usersResponse.data ?? []) as UserRow[];
  const wallets = (walletsResponse.data ?? []) as WalletRow[];
  const imageGenerations = (imageGenerationsResponse.data ?? []) as GenerationOwnerRow[];
  const audioGenerations = (audioGenerationsResponse.data ?? []) as GenerationOwnerRow[];
  const videoGenerations = (videoGenerationsResponse.data ?? []) as GenerationOwnerRow[];

  const walletByUserId = new Map(wallets.map((wallet) => [wallet.user_id, wallet]));
  const imageGenerationCounts = buildGenerationCountMap(imageGenerations);
  const audioGenerationCounts = buildGenerationCountMap(audioGenerations);
  const videoGenerationCounts = buildGenerationCountMap(videoGenerations);

  const summaries: AdminUserSummary[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    phoneNumber: user.phone_number,
    facebookPageUrl: user.facebook_page_url,
    referralCode: user.referral_code,
    credits: walletByUserId.get(user.id)?.credits ?? 0,
    generationCount:
      (imageGenerationCounts.get(user.id) ?? 0) +
      (audioGenerationCounts.get(user.id) ?? 0) +
      (videoGenerationCounts.get(user.id) ?? 0),
    joinedAt: user.created_at,
  }));

  return <AdminUsersClient users={summaries} />;
}
