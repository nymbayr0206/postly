type PricingMetric = {
  label: string;
  value: string;
  detail?: string;
};

function titleCaseValue(value: number | string) {
  return typeof value === "number" ? new Intl.NumberFormat("mn-MN").format(value) : value;
}

export function GenerationPricingCard({
  currentCost,
  currentCostDetail,
  description,
  metrics,
  note,
  className = "",
}: {
  currentCost: number | string;
  currentCostDetail?: string;
  description: string;
  metrics: PricingMetric[];
  note?: string;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5 ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Кредитийн үнэ</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Одоогийн үнэ</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {titleCaseValue(currentCost)}
            {typeof currentCost === "number" ? " кр" : ""}
          </p>
          {currentCostDetail ? <p className="mt-1 text-xs text-cyan-800">{currentCostDetail}</p> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{metric.value}</p>
            {metric.detail ? <p className="mt-1 text-xs text-slate-500">{metric.detail}</p> : null}
          </div>
        ))}
      </div>

      {note ? (
        <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-900">
          {note}
        </div>
      ) : null}
    </section>
  );
}
