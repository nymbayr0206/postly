import type { GenerationPricingPreview } from "@/lib/types";

function formatCredits(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function GenerationPricingCard({
  pricing,
  className = "",
}: {
  pricing: GenerationPricingPreview;
  className?: string;
}) {
  return (
    <section className={`rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5 ${className}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Кредитийн тооцоо</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {pricing.model_label} ашиглахад таны данснаас хэдэн кредит хасагдахыг эндээс харна.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Таны үнэ</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{formatCredits(pricing.current_cost)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Base cost</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatCredits(pricing.base_cost)} кредит</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Энгийн хэрэглэгч</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatCredits(pricing.regular_user_cost)} кредит</p>
          <p className="mt-1 text-xs text-slate-500">Multiplier: x{pricing.regular_user_multiplier}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Агент</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatCredits(pricing.agent_cost)} кредит</p>
          <p className="mt-1 text-xs text-slate-500">Multiplier: x{pricing.agent_multiplier}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">Таны эрх: {pricing.current_role_label}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">{pricing.current_tariff_name}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Multiplier x{pricing.current_multiplier}</span>
      </div>
    </section>
  );
}
