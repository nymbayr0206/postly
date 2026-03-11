import { z } from "zod";

import { getBonusCredits, getCreditPackageByKey, getTotalCredits } from "@/lib/credit-packages";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserRecords, getPlatformSettings } from "@/lib/user-data";

const requestSchema = z.object({
  package_key: z.string().min(1, "Кредитийн багц сонгоно уу."),
  payment_screenshot_url: z.string().url("Шилжүүлгийн screenshot-ийн холбоос буруу байна."),
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

    const { error } = await supabase.from("credit_requests").insert({
      user_id: user.id,
      amount: totalCredits,
      amount_mnt: selectedPackage.priceMnt,
      bonus_credits: bonusCredits,
      package_key: selectedPackage.key,
      payment_screenshot_url: parsed.data.payment_screenshot_url,
      status: "pending",
    });

    if (error) {
      throw new Error(error.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Кредитийн хүсэлт хадгалж чадсангүй: ${message}` }, { status: 500 });
  }
}
