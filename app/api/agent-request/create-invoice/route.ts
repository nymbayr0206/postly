import { AGENT_SIGNUP_PRICE_MNT } from "@/lib/agent-config";
import { AGENT_REQUEST_SELECT } from "@/lib/agent-requests";
import { createQPayInvoice } from "@/lib/qpay";
import { getQPayEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AgentRequestRow } from "@/lib/types";
import { ensureUserRecords, getAgentRequestByUserId, getUserProfile } from "@/lib/user-data";

function buildSenderInvoiceNo(userId: string) {
  const normalizedUserId = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase();
  return `AG${Date.now()}${normalizedUserId}`;
}

function buildInvoiceReceiverCode(userId: string) {
  return userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 45).toUpperCase();
}

function buildInvoiceDescription() {
  return `POSTLY AGENT ${AGENT_SIGNUP_PRICE_MNT} MNT`;
}

function resolveCallbackUrl(request: Request) {
  const { publicSiteUrl, qpayCallbackUrl } = getQPayEnv();

  if (qpayCallbackUrl) {
    return qpayCallbackUrl;
  }

  const origin = publicSiteUrl ?? new URL(request.url).origin;
  return new URL("/api/qpay/callback", origin).toString();
}

function mapQPayCreateError(message: string) {
  if (message.includes("AUTHENTICATION_FAILED") || message.includes("UNAUTHORIZED")) {
    return "QPay нэвтрэх мэдээлэл буруу байна.";
  }

  if (message.includes("INVOICE_CODE_INVALID")) {
    return "QPay invoice code буруу байна.";
  }

  if (message.includes("MERCHANT_INACTIVE")) {
    return "QPay merchant идэвхгүй байна.";
  }

  return `Агент QPay invoice үүсгэж чадсангүй: ${message}`;
}

export async function HEAD() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Агент эрх авахын тулд нэвтэрнэ үү." }, { status: 401 });
  }

  try {
    await ensureUserRecords(supabase, user);
    const [profile, existingRequest] = await Promise.all([
      getUserProfile(supabase, user.id),
      getAgentRequestByUserId(supabase, user.id),
    ]);

    if (profile.role === "agent") {
      return Response.json({ error: "Таны агент эрх аль хэдийн баталгаажсан байна." }, { status: 409 });
    }

    if (existingRequest?.status === "approved") {
      return Response.json({ error: "Таны агент хүсэлт аль хэдийн зөвшөөрөгдсөн байна." }, { status: 409 });
    }

    if (
      existingRequest?.status === "pending" &&
      existingRequest.payment_provider === "qpay" &&
      existingRequest.qpay_invoice_id &&
      existingRequest.qpay_qr_image
    ) {
      return Response.json({ request: existingRequest });
    }

    const senderInvoiceNo = buildSenderInvoiceNo(user.id);
    const invoice = await createQPayInvoice({
      amount: AGENT_SIGNUP_PRICE_MNT,
      callbackUrl: resolveCallbackUrl(request),
      description: buildInvoiceDescription(),
      invoiceReceiverCode: buildInvoiceReceiverCode(user.id),
      senderInvoiceNo,
    });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("agent_requests")
      .upsert(
        {
          user_id: user.id,
          amount_mnt: AGENT_SIGNUP_PRICE_MNT,
          payment_screenshot_url: null,
          payment_provider: "qpay",
          status: "pending",
          qpay_invoice_id: invoice.invoiceId,
          qpay_sender_invoice_no: senderInvoiceNo,
          qpay_payment_id: null,
          qpay_payment_status: "NEW",
          qpay_short_url: invoice.shortUrl,
          qpay_qr_text: invoice.qrText,
          qpay_qr_image: invoice.qrImage,
          qpay_deeplink: invoice.deeplinks,
          qpay_payment_payload: {},
          paid_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select(AGENT_REQUEST_SELECT)
      .single<AgentRequestRow>();

    if (error || !data) {
      throw new Error(error?.message ?? "AGENT_REQUEST_UPSERT_FAILED");
    }

    return Response.json({ request: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: mapQPayCreateError(message) }, { status: 500 });
  }
}
