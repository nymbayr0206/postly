import { z } from "zod";

import { CREDIT_REQUEST_SELECT } from "@/lib/credit-requests";
import { getBonusCredits, getCreditPackageByKey, getTotalCredits } from "@/lib/credit-packages";
import { getQPayEnv } from "@/lib/env";
import { createQPayInvoice } from "@/lib/qpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreditRequestRow } from "@/lib/types";
import { ensureUserRecords, getPlatformSettings } from "@/lib/user-data";

const requestSchema = z.object({
  package_key: z.string().min(1, "Кредитийн багц сонгоно уу."),
});

function buildSenderInvoiceNo(userId: string) {
  const normalizedUserId = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase();
  return `CR${Date.now()}${normalizedUserId}`;
}

function buildInvoiceReceiverCode(userId: string) {
  return userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 45).toUpperCase();
}

function buildInvoiceDescription(packageKey: string, amountMnt: number) {
  return `POSTLY ${packageKey.toUpperCase()} ${amountMnt} MNT`;
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

  return `QPay invoice үүсгэж чадсангүй: ${message}`;
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

  const selectedPackage = getCreditPackageByKey(parsed.data.package_key);

  if (!selectedPackage) {
    return Response.json({ error: "Сонгосон кредитийн багц олдсонгүй." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Кредит худалдаж авахын тулд нэвтэрнэ үү." }, { status: 401 });
  }

  try {
    await ensureUserRecords(supabase, user);
    const platformSettings = await getPlatformSettings(supabase);
    const totalCredits = getTotalCredits(selectedPackage, platformSettings.credit_price_mnt);
    const bonusCredits = getBonusCredits(selectedPackage, platformSettings.credit_price_mnt);
    const senderInvoiceNo = buildSenderInvoiceNo(user.id);

    const invoice = await createQPayInvoice({
      amount: selectedPackage.priceMnt,
      callbackUrl: resolveCallbackUrl(request),
      description: buildInvoiceDescription(selectedPackage.key, selectedPackage.priceMnt),
      invoiceReceiverCode: buildInvoiceReceiverCode(user.id),
      senderInvoiceNo,
    });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("credit_requests")
      .insert({
        user_id: user.id,
        amount: totalCredits,
        amount_mnt: selectedPackage.priceMnt,
        bonus_credits: bonusCredits,
        package_key: selectedPackage.key,
        payment_provider: "qpay",
        status: "pending",
        qpay_invoice_id: invoice.invoiceId,
        qpay_sender_invoice_no: senderInvoiceNo,
        qpay_payment_status: "NEW",
        qpay_short_url: invoice.shortUrl,
        qpay_qr_text: invoice.qrText,
        qpay_qr_image: invoice.qrImage,
        qpay_deeplink: invoice.deeplinks,
      })
      .select(CREDIT_REQUEST_SELECT)
      .single<CreditRequestRow>();

    if (error || !data) {
      throw new Error(error?.message ?? "CREDIT_REQUEST_INSERT_FAILED");
    }

    return Response.json({ request: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: mapQPayCreateError(message) }, { status: 500 });
  }
}
