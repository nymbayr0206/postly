import { z } from "zod";

import {
  deletePushSubscriptionByEndpoint,
  getLatestPushSubscriptionForUser,
  getPushSubscriptionByEndpoint,
} from "@/lib/push/subscription";
import {
  isStalePushSubscriptionError,
  sendWebPushNotification,
} from "@/lib/push/webpush";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PushNotificationPayload } from "@/lib/types";

const requestSchema = z.object({
  endpoint: z.string().url("Endpoint буруу байна.").optional(),
});

const TEST_PAYLOAD: PushNotificationPayload = {
  title: "Туршилтын мэдэгдэл",
  body: "Серверээс илгээгдсэн туршилтын мэдэгдэл",
  url: "/dashboard",
  icon: "/postly-icon.png",
  badge: "/postly-icon.png",
  tag: "postly-push-test",
};

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Туршилтын мэдэгдэл авахын тулд нэвтэрнэ үү." };
  }

  return { user };
}

export async function POST(request: Request) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Хүсэлтийн мэдээлэл буруу байна." },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedUser();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  let staleEndpoint: string | null = parsed.data.endpoint ?? null;

  try {
    const subscription = parsed.data.endpoint
      ? await getPushSubscriptionByEndpoint(admin, parsed.data.endpoint)
      : await getLatestPushSubscriptionForUser(admin, auth.user.id);

    if (!subscription) {
      return Response.json(
        {
          error:
            "Туршилтын мэдэгдэл илгээх төхөөрөмжийн бүртгэл олдсонгүй. Эхлээд төхөөрөмжөө бүртгэнэ үү.",
        },
        { status: 404 },
      );
    }

    if (subscription.user_id && subscription.user_id !== auth.user.id) {
      return Response.json(
        { error: "Өөр хэрэглэгчийн төхөөрөмжид мэдэгдэл илгээх эрхгүй байна." },
        { status: 403 },
      );
    }

    staleEndpoint = subscription.endpoint;
    await sendWebPushNotification(subscription, TEST_PAYLOAD);

    return Response.json({
      success: true,
      endpoint: subscription.endpoint,
      message: "Туршилтын мэдэгдэл илгээгдлээ.",
    });
  } catch (error) {
    if (isStalePushSubscriptionError(error) && staleEndpoint) {
      try {
        await deletePushSubscriptionByEndpoint(admin, staleEndpoint);
      } catch (cleanupError) {
        console.error("[push/test] stale subscription cleanup failed", cleanupError);
      }

      return Response.json(
        {
          error:
            "Энэ төхөөрөмжийн push endpoint хүчингүй болсон тул бүртгэлийг цэвэрлэлээ. Дахин бүртгэнэ үү.",
          stale: true,
        },
        { status: 410 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Туршилтын мэдэгдэл илгээх үед алдаа гарлаа.";

    return Response.json({ error: message }, { status: 500 });
  }
}
