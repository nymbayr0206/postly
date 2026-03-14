import {
  approveAgentRequestAction,
  rejectAgentRequestAction,
} from "@/app/admin/actions";
import { AGENT_APPROVAL_CREDITS } from "@/lib/agent-config";
import { AGENT_REQUEST_SELECT } from "@/lib/agent-requests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AgentRequestRow, UserRow, WalletRow } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(status: AgentRequestRow["status"]) {
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

  return "Хэрэглэгч";
}

function formatAmount(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

function formatProvider(request: AgentRequestRow) {
  return request.payment_provider === "qpay" ? "QPay" : "Manual";
}

function formatQPayStatus(status: string | null) {
  if (status === "PAID") {
    return "Төлөгдсөн";
  }

  if (status === "FAILED") {
    return "Амжилтгүй";
  }

  if (status === "PARTIAL") {
    return "Дутуу";
  }

  if (status === "REFUNDED") {
    return "Буцаагдсан";
  }

  return status ? status : "-";
}

function statusClasses(status: AgentRequestRow["status"]) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-800";
}

export default async function AdminAgentsPage() {
  const supabase = await createSupabaseServerClient();
  const [agentRequestsResponse, usersResponse, walletsResponse] = await Promise.all([
    supabase
      .from("agent_requests")
      .select(AGENT_REQUEST_SELECT)
      .order("created_at", { ascending: false })
      .returns<AgentRequestRow[]>(),
    supabase.from("users").select("id,email,role,tariff_id,referral_code,referred_by_user_id,created_at"),
    supabase.from("wallets").select("id,user_id,credits,created_at"),
  ]);

  if (agentRequestsResponse.error || usersResponse.error || walletsResponse.error) {
    throw new Error("Агент хүсэлтүүдийг ачаалж чадсангүй.");
  }

  const requests = (agentRequestsResponse.data ?? []) as AgentRequestRow[];
  const users = (usersResponse.data ?? []) as UserRow[];
  const wallets = (walletsResponse.data ?? []) as WalletRow[];
  const userById = new Map(users.map((user) => [user.id, user]));
  const walletByUserId = new Map(wallets.map((wallet) => [wallet.user_id, wallet]));
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedCount = requests.filter((request) => request.status === "approved").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Нийт агент хүсэлт</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{requests.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Хүлээгдэж буй</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Зөвшөөрсөн агент</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{approvedCount}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Агент хүсэлтүүд</h1>
          <p className="mt-1 text-sm text-slate-500">
            QPay болон legacy manual хүсэлтүүд энд харагдана. Төлбөр батлагдвал хэрэглэгч agent болж{" "}
            {formatCredits(AGENT_APPROVAL_CREDITS)} кредит авна.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Одоогоор агент хүсэлт алга байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-6 py-3 font-medium">Хэрэглэгч</th>
                  <th className="px-6 py-3 font-medium">Одоогийн эрх</th>
                  <th className="px-6 py-3 font-medium">Төлбөр</th>
                  <th className="px-6 py-3 font-medium">Provider</th>
                  <th className="px-6 py-3 font-medium">Баримт / Invoice</th>
                  <th className="px-6 py-3 font-medium">QPay төлөв</th>
                  <th className="px-6 py-3 font-medium">Кредит</th>
                  <th className="px-6 py-3 font-medium">Систем төлөв</th>
                  <th className="px-6 py-3 font-medium">Илгээсэн</th>
                  <th className="px-6 py-3 font-medium">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const user = userById.get(request.user_id);
                  const wallet = walletByUserId.get(request.user_id);
                  const canApprove =
                    request.payment_provider !== "qpay" && Boolean(request.payment_screenshot_url);

                  return (
                    <tr key={request.id} className="border-b border-slate-100 align-top">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{user?.email ?? request.user_id}</div>
                        <div className="mt-1 text-xs text-slate-500">{request.id}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{formatRole(user?.role)}</td>
                      <td className="px-6 py-4 text-slate-900">{formatAmount(request.amount_mnt)}</td>
                      <td className="px-6 py-4 text-slate-700">{formatProvider(request)}</td>
                      <td className="px-6 py-4">
                        {request.payment_provider === "qpay" ? (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-500">
                              {request.qpay_sender_invoice_no ?? request.qpay_invoice_id ?? "-"}
                            </div>
                            {request.qpay_short_url ? (
                              <a
                                href={request.qpay_short_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                QPay линк
                              </a>
                            ) : null}
                          </div>
                        ) : request.payment_screenshot_url ? (
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
                          <span className="text-xs text-slate-400">Баримт алга</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <div>{formatQPayStatus(request.qpay_payment_status)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {request.paid_at ? formatDate(request.paid_at) : "-"}
                        </div>
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
                          request.payment_provider === "qpay" ? (
                            <span className="text-xs text-sky-700">
                              QPay callback эсвэл хэрэглэгчийн payment check-ээр автоматаар approve болно.
                            </span>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <form action={approveAgentRequestAction}>
                                  <input type="hidden" name="request_id" value={request.id} />
                                  <button
                                    type="submit"
                                    disabled={!canApprove}
                                    className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                  >
                                    Зөвшөөрөх
                                  </button>
                                </form>
                                <form action={rejectAgentRequestAction}>
                                  <input type="hidden" name="request_id" value={request.id} />
                                  <button
                                    type="submit"
                                    className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600"
                                  >
                                    Татгалзах
                                  </button>
                                </form>
                              </div>
                              {!canApprove ? (
                                <p className="text-xs text-amber-600">Баримт орсны дараа approve хийнэ.</p>
                              ) : null}
                            </div>
                          )
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
