import { updateModelCostAction, updateTariffAction } from "@/app/admin/actions";
import { getActiveModelNames } from "@/lib/env";
import {
  formatCredits,
  getAdminPricingSummary,
  getStartingCreditsForModel,
  isFixedPricingModel,
} from "@/lib/generation-pricing";
import { getModelDisplayName } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getModels, getTariffs } from "@/lib/user-data";

function roleLabel(name: string) {
  if (name === "Agent") {
    return "Агент";
  }

  if (name === "Regular User") {
    return "Энгийн хэрэглэгч";
  }

  return name;
}

export default async function AdminPricingPage() {
  const supabase = await createSupabaseServerClient();
  const [tariffs, models] = await Promise.all([getTariffs(supabase), getModels(supabase)]);
  const env = getActiveModelNames();

  const activeModelMap = new Map<string, string>([
    [env.nanoBananaModelName, "Зураг үүсгэх"],
    [env.elevenlabsModelName, "Аудио үүсгэх"],
    [env.runwayModelName, "Видео үүсгэх"],
  ]);

  const orderedModels = [...models].sort((left, right) => {
    const leftPriority = activeModelMap.has(left.name) ? 0 : 1;
    const rightPriority = activeModelMap.has(right.name) ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.name.localeCompare(right.name);
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Нийт model</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{models.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Зургийн үнэ</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">1K: 8 · 2K: 12 · 4K: 18</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Аудионы үнэ</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">14 кредит / 1,000 тэмдэгт</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Видеоны үнэ</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">12 эсвэл 30 кредит / видео</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Тарифын үржүүлэгч</h1>
          <p className="mt-1 text-sm text-slate-500">
            Идэвхтэй image, audio, video flow нь fixed pricing ашиглаж байна. Доорх үржүүлэгч нь
            нөөц болон legacy model-уудад л үйлчилнэ.
          </p>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          {tariffs.map((tariff) => (
            <article key={tariff.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{roleLabel(tariff.name)}</p>
                  <p className="mt-1 text-sm text-slate-500">Одоогийн үржүүлэгч: x{tariff.multiplier}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  Нөөц
                </span>
              </div>

              <form action={updateTariffAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <input type="hidden" name="tariff_id" value={tariff.id} />
                <label className="flex-1">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Үржүүлэгч
                  </span>
                  <input
                    type="number"
                    name="multiplier"
                    min={1}
                    step={1}
                    defaultValue={tariff.multiplier}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Хадгалах
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Model үнийн дүрэм</h2>
          <p className="mt-1 text-sm text-slate-500">
            Идэвхтэй model-ууд дээр fixed rule үйлчилнэ. Нөөц model-ууд дээр base cost-г доороос
            засах боломжтой.
          </p>
        </div>

        <div className="grid gap-4 px-6 py-5 lg:grid-cols-2">
          {orderedModels.map((model) => {
            const usageLabel = activeModelMap.get(model.name);
            const fixedPricing = isFixedPricingModel(model.name);
            const summary = getAdminPricingSummary(model.name);

            return (
              <article key={model.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{getModelDisplayName(model.name)}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{model.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      usageLabel ? "bg-cyan-100 text-cyan-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {usageLabel ?? "Нөөц model"}
                  </span>
                </div>

                {fixedPricing ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Эхлэх үнэ</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {formatCredits(getStartingCreditsForModel(model.name))} кредит
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Үнийн тайлбар</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{summary.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{summary.description}</p>
                      </div>
                    </div>

                    {summary.bullets.length ? (
                      <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
                        <ul className="space-y-2 text-sm leading-6 text-slate-700">
                          {summary.bullets.map((bullet) => (
                            <li key={bullet}>• {bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Base cost</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {formatCredits(model.base_cost)} кредит
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Энгийн хэрэглэгч</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {formatCredits(model.base_cost * (tariffs.find((tariff) => tariff.name === "Regular User")?.multiplier ?? 1))}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Агент</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {formatCredits(model.base_cost * (tariffs.find((tariff) => tariff.name === "Agent")?.multiplier ?? 1))}
                        </p>
                      </div>
                    </div>

                    <form action={updateModelCostAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <input type="hidden" name="model_id" value={model.id} />
                      <label className="flex-1">
                        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          Base cost
                        </span>
                        <input
                          type="number"
                          name="base_cost"
                          min={1}
                          step={1}
                          defaultValue={model.base_cost}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                        />
                      </label>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Үнэ хадгалах
                      </button>
                    </form>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
