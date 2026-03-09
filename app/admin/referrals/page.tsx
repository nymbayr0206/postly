import {
  approveReferralPayoutRequestAction,
  rejectReferralPayoutRequestAction,
} from "@/app/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReferralPayoutRequestRow, UserRow } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

function formatStatus(status: ReferralPayoutRequestRow["status"]) {
  if (status === "approved") {
    return "Шилжүүлсэн";
  }

  if (status === "rejected") {
    return "Татгалзсан";
  }

  return "Хүлээгдэж буй";
}

function statusClasses(status: ReferralPayoutRequestRow["status"]) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-800";
}

export default async function AdminReferralsPage() {
  const supabase = await createSupabaseServerClient();
  const [requestsResponse, usersResponse] = await Promise.all([
    supabase
      .from("referral_payout_requests")
      .select("id,user_id,amount_mnt,bank_name,account_holder,account_number,status,created_at,updated_at")
      .order("created_at", { ascending: false }),
    supabase.from("users").select("id,email,role,tariff_id,referral_code,referred_by_user_id,created_at"),
  ]);

  if (requestsResponse.error || usersResponse.error) {
    throw new Error("Урамшууллын мөнгөний хүсэлтүүдийг ачаалж чадсангүй.");
  }

  const requests = (requestsResponse.data ?? []) as ReferralPayoutRequestRow[];
  const users = (usersResponse.data ?? []) as UserRow[];
  const userById = new Map(users.map((user) => [user.id, user]));

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const totalPendingMnt = requests
    .filter((request) => request.status === "pending")
    .reduce((sum, request) => sum + request.amount_mnt, 0);
  const totalPaidMnt = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + request.amount_mnt, 0);

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
          <p className="text-sm text-slate-500">Хүлээгдэж буй дүн</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMnt(totalPendingMnt)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Шилжүүлсэн нийт дүн</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMnt(totalPaidMnt)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Урамшууллын мөнгө татах хүсэлтүүд</h1>
          <p className="mt-1 text-sm text-slate-500">
            Affiliate урамшууллын мөнгийг хэрэглэгчийн данс руу шилжүүлэх хүсэлтүүдийг эндээс шийдвэрлэнэ.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Одоогоор урамшууллын мөнгөний хүсэлт алга байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-6 py-3 font-medium">Хэрэглэгч</th>
                  <th className="px-6 py-3 font-medium">Дүн</th>
                  <th className="px-6 py-3 font-medium">Банк</th>
                  <th className="px-6 py-3 font-medium">Данс эзэмшигч</th>
                  <th className="px-6 py-3 font-medium">Дансны дугаар</th>
                  <th className="px-6 py-3 font-medium">Төлөв</th>
                  <th className="px-6 py-3 font-medium">Илгээсэн</th>
                  <th className="px-6 py-3 font-medium">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const user = userById.get(request.user_id);

                  return (
                    <tr key={request.id} className="border-b border-slate-100 align-top">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{user?.email ?? request.user_id}</div>
                        <div className="mt-1 text-xs text-slate-500">{request.id}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{formatMnt(request.amount_mnt)}</td>
                      <td className="px-6 py-4 text-slate-700">{request.bank_name}</td>
                      <td className="px-6 py-4 text-slate-700">{request.account_holder}</td>
                      <td className="px-6 py-4 font-mono text-slate-700">{request.account_number}</td>
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
                            <form action={approveReferralPayoutRequestAction}>
                              <input type="hidden" name="request_id" value={request.id} />
                              <button
                                type="submit"
                                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                              >
                                Шилжүүлсэн
                              </button>
                            </form>
                            <form action={rejectReferralPayoutRequestAction}>
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
