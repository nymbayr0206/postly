import { CREDIT_REQUEST_SELECT } from "@/lib/credit-requests";
import { getQPayPayment } from "@/lib/qpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreditRequestRow } from "@/lib/types";

function successResponse() {
  return new Response("SUCCESS", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("qpay_payment_id");

  if (!paymentId) {
    return successResponse();
  }

  try {
    const payment = await getQPayPayment(paymentId);

    if (payment.object_type !== "INVOICE" || !payment.object_id) {
      return successResponse();
    }

    const admin = createSupabaseAdminClient();
    const { data: requestRow } = await admin
      .from("credit_requests")
      .select(CREDIT_REQUEST_SELECT)
      .eq("qpay_invoice_id", payment.object_id)
      .maybeSingle<CreditRequestRow>();

    if (!requestRow) {
      return successResponse();
    }

    const { error } = await admin.rpc("finalize_qpay_credit_request", {
      p_request_id: requestRow.id,
      p_qpay_payment_id: payment.payment_id,
      p_qpay_payment_status: payment.payment_status,
      p_payment_payload: payment,
      p_paid_at: payment.payment_date ?? null,
    });

    if (error) {
      console.error("QPay finalize callback error", error.message);
    }
  } catch (error) {
    console.error("QPay callback failed", error);
  }

  return successResponse();
}
