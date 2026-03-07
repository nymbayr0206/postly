import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GenerationRow } from "@/lib/types";
import { ensureUserRecords, getUserProfile, getWallet } from "@/lib/user-data";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureUserRecords(supabase, user);

  const [profile, wallet, generationsResponse] = await Promise.all([
    getUserProfile(supabase, user.id),
    getWallet(supabase, user.id),
    supabase
      .from("generations")
      .select("id,user_id,model_name,prompt,aspect_ratio,cost,image_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (generationsResponse.error) {
    throw new Error(generationsResponse.error.message);
  }

  const generations = (generationsResponse.data ?? []) as GenerationRow[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Welcome back</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">{profile.email}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Role: <span className="font-medium text-slate-900">{profile.role}</span>
            </p>
          </div>

          {profile.role === "admin" ? (
            <Link
              href="/admin/credits"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Open Admin Panel
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Current credits</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{wallet.credits}</p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Recent generations</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{generations.length}</p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Latest activity</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {generations[0] ? formatDate(generations[0].created_at) : "No history yet"}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/dashboard/image"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Generate Image</h2>
          <p className="mt-2 text-sm text-slate-600">Create a new NanoBanana image.</p>
        </Link>
        <Link
          href="/dashboard/history"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">History</h2>
          <p className="mt-2 text-sm text-slate-600">Review your latest generated assets.</p>
        </Link>
        <Link
          href="/dashboard/billing"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Credit Requests</h2>
          <p className="mt-2 text-sm text-slate-600">Submit and track credit top-up requests.</p>
        </Link>
        <Link
          href="/dashboard/settings"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
          <p className="mt-2 text-sm text-slate-600">Manage your account preferences.</p>
        </Link>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Latest generations</h2>
          <Link href="/dashboard/history" className="text-sm font-medium text-cyan-700 hover:text-cyan-600">
            View all
          </Link>
        </div>

        {generations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No generations yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {generations.map((generation) => (
              <div
                key={generation.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{generation.prompt}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {generation.model_name} · {generation.cost} credits · {formatDate(generation.created_at)}
                  </p>
                </div>

                <a
                  href={generation.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Open
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
