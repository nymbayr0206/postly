import type { GenerationRow } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function GenerationHistory({ generations }: { generations: GenerationRow[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">Үүсгэлтийн түүх</h2>

      {generations.length === 0 ? (
        <p className="text-sm text-slate-600">Одоогоор үүсгэсэн зураг алга байна.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Промпт</th>
                <th className="py-2 pr-4 font-medium">Зураг</th>
                <th className="py-2 pr-4 font-medium">Кредит</th>
                <th className="py-2 pr-4 font-medium">Огноо</th>
                <th className="py-2 font-medium">Татах</th>
              </tr>
            </thead>
            <tbody>
              {generations.map((generation) => (
                <tr key={generation.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 text-slate-800">{generation.prompt}</td>
                  <td className="py-3 pr-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generation.image_url}
                      alt={generation.prompt}
                      className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                    />
                  </td>
                  <td className="py-3 pr-4 text-slate-800">{generation.cost}</td>
                  <td className="py-3 pr-4 text-slate-600">{formatDate(generation.created_at)}</td>
                  <td className="py-3">
                    <a
                      href={generation.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      Татах
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
