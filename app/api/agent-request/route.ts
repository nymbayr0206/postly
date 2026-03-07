import { z } from "zod";

import { AGENT_SIGNUP_PRICE_MNT } from "@/lib/agent-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecords, getAgentRequestByUserId, getUserProfile } from "@/lib/user-data";

const requestSchema = z.object({
  payment_screenshot_url: z.string().url("Хуулганы хүчинтэй холбоос шаардлагатай."),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON хүсэлтийн бие буруу байна." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Хүсэлтийн мэдээлэл буруу байна." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Агент хүсэлт илгээхийн тулд нэвтэрнэ үү." }, { status: 401 });
  }

  try {
    await ensureUserRecords(supabase, user);

    const profile = await getUserProfile(supabase, user.id);

    if (profile.role === "agent") {
      return Response.json({ error: "Таны агент эрх аль хэдийн баталгаажсан байна." }, { status: 409 });
    }

    const existingRequest = await getAgentRequestByUserId(supabase, user.id);

    if (existingRequest?.status === "approved") {
      return Response.json({ error: "Таны агент хүсэлт аль хэдийн зөвшөөрөгдсөн байна." }, { status: 409 });
    }

    const payload = {
      user_id: user.id,
      amount_mnt: AGENT_SIGNUP_PRICE_MNT,
      payment_screenshot_url: parsed.data.payment_screenshot_url,
      status: "pending" as const,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("agent_requests").upsert(payload, { onConflict: "user_id" });

    if (error) {
      throw new Error(error.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Агент хүсэлт хадгалж чадсангүй: ${message}` }, { status: 500 });
  }
}
