import type { CreditRequestRow } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusStyles(status: CreditRequestRow["status"]) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-amber-100 text-amber-800";
}

function statusLabel(status: CreditRequestRow["status"]) {
  if (status === "approved") {
    return "Зөвшөөрсөн";
  }

  if (status === "rejected") {
    return "Татгалзсан";
  }

  return "Хүлээгдэж буй";
}

export function CreditRequestPanel({
  requests,
  action,
}: {
  requests: CreditRequestRow[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Кредитийн хүсэлт</h2>
      <p className="mt-1 text-sm text-slate-600">
        Нэмэлт кредит хүсэж илгээгээд админы шийдвэрийг хүлээнэ үү.
      </p>

      <form action={action} className="mt-4 flex items-end gap-3">
        <label className="text-sm font-medium text-slate-700">
          Хэмжээ
          <input
            name="amount"
            type="number"
            min={1}
            step={1}
            required
            className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Хүсэлт илгээх
        </button>
      </form>

      {requests.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3 font-medium">Кредит</th>
                <th className="py-2 pr-3 font-medium">Төлөв</th>
                <th className="py-2 font-medium">Огноо</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-800">{request.amount}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles(request.status)}`}
                    >
                      {statusLabel(request.status)}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600">{formatDate(request.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">Одоогоор кредитийн хүсэлт алга.</p>
      )}
    </section>
  );
}
