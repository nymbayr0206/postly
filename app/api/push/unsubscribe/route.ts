import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deletePushSubscriptionByEndpoint,
  getPushSubscriptionByEndpoint,
  parsePushSubscriptionRequest,
  pushEndpointSchema,
} from "@/lib/push/subscription";

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Төхөөрөмжийн бүртгэл устгахын тулд нэвтэрнэ үү." };
  }

  return { user };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON хүсэлтийн бие буруу байна." }, { status: 400 });
  }

  const auth = await requireAuthenticatedUser();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const parsedEndpoint = pushEndpointSchema.safeParse(body);
  const parsedSubscription = parsePushSubscriptionRequest(body);
  const endpoint = parsedEndpoint.success
    ? parsedEndpoint.data.endpoint
    : parsedSubscription.success
      ? parsedSubscription.data.subscription.endpoint
      : null;

  if (!endpoint) {
    return Response.json({ error: "Устгах endpoint буруу байна." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const record = await getPushSubscriptionByEndpoint(admin, endpoint);

    if (!record) {
      return Response.json({
        success: true,
        message: "Push subscription аль хэдийн устсан байна.",
      });
    }

    if (record.user_id && record.user_id !== auth.user.id) {
      return Response.json(
        { error: "Өөр хэрэглэгчийн төхөөрөмжид хандах эрхгүй байна." },
        { status: 403 },
      );
    }

    await deletePushSubscriptionByEndpoint(admin, endpoint);

    return Response.json({ success: true, message: "Төхөөрөмжийн бүртгэл устлаа." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Төхөөрөмжийн бүртгэл устгаж чадсангүй.";
    return Response.json({ error: message }, { status: 500 });
  }
}
