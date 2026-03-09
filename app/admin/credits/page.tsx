import {
  approveCreditRequestAction,
  rejectCreditRequestAction,
} from "@/app/admin/actions";
import { getCreditPackageByKey } from "@/lib/credit-packages";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreditRequestRow, UserRow, WalletRow } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(status: CreditRequestRow["status"]) {
  if (status === "approved") {
    return "Зөвшөөрсөн";
  }

  if (status === "rejected") {
    return "Татгалзсан";
  }

  return "Хүлээгдэж буй";
}

function formatRole(role: UserRow["role"] | undefined) {
  if (role === "admin") {
    return "Админ";
  }

  if (role === "agent") {
    return "Агент";
  }

  if (role === "user") {
    return "Хэрэглэгч";
  }

  return "-";
}

function formatMnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

function statusClasses(status: CreditRequestRow["status"]) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-800";
}

function packageLabel(request: CreditRequestRow) {
  if (!request.package_key) {
    return "Хуучин хүсэлт";
  }

  return getCreditPackageByKey(request.package_key)?.label ?? "Тусгай хүсэлт";
}

export default async function AdminCreditsPage() {
  const supabase = await createSupabaseServerClient();
  const [creditRequestsResponse, usersResponse, walletsResponse] = await Promise.all([
    supabase
      .from("credit_requests")
      .select("id,user_id,amount,amount_mnt,bonus_credits,package_key,payment_screenshot_url,status,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("users").select("id,email,role,tariff_id,referral_code,referred_by_user_id,created_at"),
    supabase.from("wallets").select("id,user_id,credits,created_at"),
  ]);

  if (creditRequestsResponse.error || usersResponse.error || walletsResponse.error) {
    throw new Error("Кредит хүсэлтүүдийг ачаалж чадсангүй.");
  }

  const requests = (creditRequestsResponse.data ?? []) as CreditRequestRow[];
  const users = (usersResponse.data ?? []) as UserRow[];
  const wallets = (walletsResponse.data ?? []) as WalletRow[];

  const userById = new Map(users.map((user) => [user.id, user]));
  const walletByUserId = new Map(wallets.map((wallet) => [wallet.user_id, wallet]));
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedCredits = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + request.amount, 0);
  const approvedRevenue = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + (request.amount_mnt ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Нийт хүсэлт</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{requests.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Хүлээгдэж буй</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Зөвшөөрсөн кредит</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCredits(approvedCredits)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Зөвшөөрсөн орлого</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMnt(approvedRevenue)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Кредит худалдан авалтын хүсэлтүүд</h1>
          <p className="mt-1 text-sm text-slate-500">
            Хэрэглэгчийн сонгосон багц, шилжүүлгийн баримт, бонус кредитийг шалгаад шийдвэрлэнэ.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Одоогоор кредит хүсэлт алга байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-6 py-3 font-medium">Хэрэглэгч</th>
                  <th className="px-6 py-3 font-medium">Эрх</th>
                  <th className="px-6 py-3 font-medium">Багц</th>
                  <th className="px-6 py-3 font-medium">Төлбөр</th>
                  <th className="px-6 py-3 font-medium">Олгох кредит</th>
                  <th className="px-6 py-3 font-medium">Бонус</th>
                  <th className="px-6 py-3 font-medium">Баримт</th>
                  <th className="px-6 py-3 font-medium">Үлдэгдэл</th>
                  <th className="px-6 py-3 font-medium">Төлөв</th>
                  <th className="px-6 py-3 font-medium">Илгээсэн</th>
                  <th className="px-6 py-3 font-medium">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const user = userById.get(request.user_id);
                  const wallet = walletByUserId.get(request.user_id);

                  return (
                    <tr key={request.id} className="border-b border-slate-100 align-top">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{user?.email ?? request.user_id}</div>
                        <div className="mt-1 text-xs text-slate-500">{request.id}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{formatRole(user?.role)}</td>
                      <td className="px-6 py-4 text-slate-900">{packageLabel(request)}</td>
                      <td className="px-6 py-4 text-slate-900">
                        {request.amount_mnt ? formatMnt(request.amount_mnt) : "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-900">{formatCredits(request.amount)}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {request.bonus_credits > 0 ? formatCredits(request.bonus_credits) : "Байхгүй"}
                      </td>
                      <td className="px-6 py-4">
                        {request.payment_screenshot_url ? (
                          <div className="flex items-start gap-3">
                            <a
                              href={request.payment_screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Баримт нээх
                            </a>
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={request.payment_screenshot_url}
                                alt="Шилжүүлгийн баримт"
                                className="h-20 w-28 object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Баримтгүй</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{wallet?.credits ?? 0}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(request.status)}`}
                        >
                          {formatStatus(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(request.created_at)}</td>
                      <td className="px-6 py-4">
                        {request.status === "pending" ? (
                          <div className="flex gap-2">
                            <form action={approveCreditRequestAction}>
                              <input type="hidden" name="request_id" value={request.id} />
                              <button
                                type="submit"
                                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                              >
                                Зөвшөөрөх
                              </button>
                            </form>
                            <form action={rejectCreditRequestAction}>
                              <input type="hidden" name="request_id" value={request.id} />
                              <button
                                type="submit"
                                className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600"
                              >
                                Татгалзах
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Шийдвэрлэсэн</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
