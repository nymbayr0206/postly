"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AGENT_APPROVAL_CREDITS, AGENT_SIGNUP_PRICE_MNT } from "@/lib/agent-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "login" | "signup";
type RequestedRole = "user" | "agent";

function formatMnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [requestedRole, setRequestedRole] = useState<RequestedRole>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Имэйл хаягаа оруулна уу.");
      return;
    }

    if (password.length < 6) {
      setError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна.");
      return;
    }

    setIsPending(true);

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsPending(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          requested_role: requestedRole,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsPending(false);
      return;
    }

    if (!data.session) {
      setMessage(
        requestedRole === "agent"
          ? "Бүртгэл амжилттай үүслээ. Имэйлээ баталгаажуулаад нэвтэрсний дараа агентын төлбөрийн баримтаа илгээнэ үү."
          : "Бүртгэл амжилттай үүслээ. Имэйлээ баталгаажуулаад дараа нь нэвтэрнэ үү.",
      );
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setIsPending(false);
      return;
    }

    router.push(requestedRole === "agent" ? "/dashboard/agent-onboarding" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setMessage(null);
          }}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Нэвтрэх
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setMessage(null);
          }}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Бүртгүүлэх
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Бүртгэлийн төрөл</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRequestedRole("user")}
                className={`rounded-2xl border p-4 text-left transition ${
                  requestedRole === "user"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold">Энгийн хэрэглэгч</div>
                <p
                  className={`mt-2 text-xs ${
                    requestedRole === "user" ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  Шууд данс нээгдэж, үндсэн үйлчилгээ ашиглана.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRequestedRole("agent")}
                className={`rounded-2xl border p-4 text-left transition ${
                  requestedRole === "agent"
                    ? "border-cyan-700 bg-cyan-700 text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:border-cyan-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Агент</div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      requestedRole === "agent"
                        ? "bg-white/20 text-white"
                        : "bg-cyan-50 text-cyan-700"
                    }`}
                  >
                    {formatMnt(AGENT_SIGNUP_PRICE_MNT)}
                  </span>
                </div>
                <p
                  className={`mt-2 text-xs ${
                    requestedRole === "agent" ? "text-cyan-50" : "text-slate-500"
                  }`}
                >
                  Төлбөрийн хэсэг рүү орж баримт илгээнэ. Зөвшөөрөгдвөл {formatCredits(AGENT_APPROVAL_CREDITS)} кредит
                  болон Хичээл tab нээгдэнэ.
                </p>
              </button>
            </div>
          </div>
        ) : null}

        <label className="block text-sm font-medium text-slate-700">
          Имэйл
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            placeholder="name@example.com"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Нууц үг
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            placeholder="Хамгийн багадаа 6 тэмдэгт"
            required
          />
        </label>

        {mode === "signup" ? (
          <label className="block text-sm font-medium text-slate-700">
            Нууц үг давтах
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              required
            />
          </label>
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? "Түр хүлээнэ үү..." : mode === "login" ? "Нэвтрэх" : "Бүртгэл үүсгэх"}
        </button>
      </form>
    </div>
  );
}
