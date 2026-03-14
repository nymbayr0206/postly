import { z } from "zod";

import { CREDIT_REQUEST_SELECT } from "@/lib/credit-requests";
import { checkQPayPayment, getPaidQPayRow } from "@/lib/qpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreditRequestRow } from "@/lib/types";

const requestSchema = z.object({
  request_id: z.string().uuid("QPay request id буруу байна."),
});

function mapQPayCheckError(message: string) {
  if (message.includes("AUTHENTICATION_FAILED") || message.includes("UNAUTHORIZED")) {
    return "QPay нэвтрэх мэдээлэл буруу байна.";
  }

  if (message.includes("REQUEST_NOT_FOUND")) {
    return "Төлбөрийн хүсэлт олдсонгүй.";
  }

  return `QPay төлбөр шалгах үед алдаа гарлаа: ${message}`;
}

export async function HEAD() {
  return new Response(null, { status: 204 });
}

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
    return Response.json({ error: "Нэвтэрнэ үү." }, { status: 401 });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("credit_requests")
    .select(CREDIT_REQUEST_SELECT)
    .eq("id", parsed.data.request_id)
    .eq("user_id", user.id)
    .maybeSingle<CreditRequestRow>();

  if (requestError) {
    return Response.json({ error: requestError.message }, { status: 500 });
  }

  if (!requestRow) {
    return Response.json({ error: "Төлбөрийн хүсэлт олдсонгүй." }, { status: 404 });
  }

  if (requestRow.payment_provider !== "qpay" || !requestRow.qpay_invoice_id) {
    return Response.json({ error: "Энэ хүсэлт QPay хүсэлт биш байна." }, { status: 400 });
  }

  if (requestRow.status === "approved") {
    return Response.json({ approved: true, request: requestRow });
  }

  try {
    const paymentCheck = await checkQPayPayment(requestRow.qpay_invoice_id);
    const paymentRow = getPaidQPayRow(paymentCheck.rows, requestRow.amount_mnt ?? 0);
    const admin = createSupabaseAdminClient();

    if (paymentRow) {
      const { error } = await admin.rpc("finalize_qpay_credit_request", {
        p_request_id: requestRow.id,
        p_qpay_payment_id: paymentRow.payment_id,
        p_qpay_payment_status: paymentRow.payment_status,
        p_payment_payload: paymentRow,
        p_paid_at: null,
      });

      if (error) {
        throw new Error(error.message);
      }
    }

    const { data: updatedRequest, error: updatedRequestError } = await supabase
      .from("credit_requests")
      .select(CREDIT_REQUEST_SELECT)
      .eq("id", requestRow.id)
      .eq("user_id", user.id)
      .maybeSingle<CreditRequestRow>();

    if (updatedRequestError || !updatedRequest) {
      throw new Error(updatedRequestError?.message ?? "UPDATED_REQUEST_NOT_FOUND");
    }

    return Response.json({
      approved: updatedRequest.status === "approved",
      request: updatedRequest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: mapQPayCheckError(message) }, { status: 500 });
  }
}
