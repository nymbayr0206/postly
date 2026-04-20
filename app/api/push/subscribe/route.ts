import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  detectDevicePlatformFromUserAgent,
  parsePushSubscriptionRequest,
  upsertPushSubscriptionRecord,
} from "@/lib/push/subscription";
import { ensureUserRecords } from "@/lib/user-data";

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Төхөөрөмж бүртгэхийн тулд нэвтэрнэ үү." };
  }

  await ensureUserRecords(supabase, user);
  return { user };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON хүсэлтийн бие буруу байна." }, { status: 400 });
  }

  const parsed = parsePushSubscriptionRequest(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const auth = await requireAuthenticatedUser();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { subscription, appInstalled, devicePlatform } = parsed.data;
  const userAgent = request.headers.get("user-agent");

  try {
    const saved = await upsertPushSubscriptionRecord(createSupabaseAdminClient(), {
      userId: auth.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      devicePlatform: devicePlatform ?? detectDevicePlatformFromUserAgent(userAgent),
      appInstalled,
    });

    return Response.json({
      success: true,
      endpoint: saved.endpoint,
      updated_at: saved.updated_at,
      message: "Төхөөрөмж амжилттай бүртгэгдлээ.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Төхөөрөмж бүртгэж чадсангүй.";
    return Response.json({ error: message }, { status: 500 });
  }
}
