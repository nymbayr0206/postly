"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AGENT_APPROVAL_CREDITS, AGENT_SIGNUP_PRICE_MNT } from "@/lib/agent-config";
import { REFERRAL_SIGNUP_BONUS_MNT } from "@/lib/referral-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "login" | "signup";
type RequestedRole = "user" | "agent";
type SignupStep = 1 | 2;

function formatNumber(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatMnt(value: number) {
  return `${formatNumber(value)}₮`;
}

function normalizeReferralCode(value: string | null) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeProfileField(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function AuthForm() {
  const searchParams = useSearchParams();
  const referralCode = normalizeReferralCode(searchParams.get("ref"));

  const [mode, setMode] = useState<Mode>(referralCode ? "signup" : "login");
  const [requestedRole, setRequestedRole] = useState<RequestedRole>("user");
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [facebookPageUrl, setFacebookPageUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isRegularUserSignup = mode === "signup" && requestedRole === "user";
  const isProfileStep = isRegularUserSignup && signupStep === 2;

  function resetFeedback() {
    setError(null);
    setMessage(null);
  }

  function validateCredentials() {
    if (!email.trim()) {
      setError("Имэйл хаягаа оруулна уу.");
      return false;
    }

    if (password.length < 6) {
      setError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");
      return false;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна.");
      return false;
    }

    return true;
  }

  function resetSignupStep() {
    setSignupStep(1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();

    if (!validateCredentials()) {
      return;
    }

    if (mode === "login") {
      setIsPending(true);

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

    if (requestedRole === "user" && signupStep === 1) {
      setSignupStep(2);
      return;
    }

    setIsPending(true);

    const normalizedFullName = normalizeProfileField(fullName);
    const normalizedPhoneNumber = normalizeProfileField(phoneNumber);
    const normalizedFacebookPageUrl = normalizeProfileField(facebookPageUrl);
    const metadata = {
      requested_role: requestedRole,
      ...(referralCode ? { referral_code: referralCode } : {}),
      ...(normalizedFullName ? { full_name: normalizedFullName } : {}),
      ...(normalizedPhoneNumber ? { phone_number: normalizedPhoneNumber } : {}),
      ...(normalizedFacebookPageUrl ? { facebook_page_url: normalizedFacebookPageUrl } : {}),
    };

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: metadata,
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
          ? "Бүртгэл үүслээ. Имэйлээ баталгаажуулаад нэвтэрсний дараа агентын төлбөрийн баримтаа илгээнэ үү."
          : "Бүртгэл үүслээ. Имэйлээ баталгаажуулаад дараа нь нэвтэрнэ үү.",
      );
      setMode("login");
      setSignupStep(1);
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setPhoneNumber("");
      setFacebookPageUrl("");
      setIsPending(false);
      return;
    }

    router.push(requestedRole === "agent" ? "/dashboard/agent-onboarding" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-[1.75rem] bg-white px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          {mode === "login" ? "Нэвтрэх" : "Шинэ бүртгэл"}
        </div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {mode === "login" ? "Postly руу нэвтрэх" : "Postly данс үүсгэх"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {mode === "login"
            ? "Контент үүсгэх үндсэн урсгалууд руу шууд орно."
            : "Энгийн хэрэглэгчээр шууд эхлэх эсвэл агентын эрхийн урсгал руу орно."}
        </p>
      </div>

      {referralCode ? (
        <div className="mb-5 rounded-[1.25rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          <div className="font-semibold">Урилгын линкээр орж ирсэн байна</div>
          <p className="mt-1 leading-6 text-cyan-800">
            Энэ линкээр энгийн хэрэглэгчээр бүртгүүлбэл {formatMnt(REFERRAL_SIGNUP_BONUS_MNT)}-ийн үнэтэй үнэгүй кредит шууд авна.
          </p>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[1.25rem] bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            resetFeedback();
            resetSignupStep();
          }}
          className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
            mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
          }`}
        >
          Нэвтрэх
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            resetFeedback();
            resetSignupStep();
          }}
          className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
            mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
          }`}
        >
          Бүртгүүлэх
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-700">Бүртгэлийн төрөл</div>
              {requestedRole === "user" ? (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Алхам {signupStep}/2
                </div>
              ) : null}
            </div>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  resetFeedback();
                  if (requestedRole !== "user") {
                    setRequestedRole("user");
                    setSignupStep(1);
                  }
                }}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  requestedRole === "user"
                    ? "border-cyan-300 bg-cyan-50 shadow-[0_10px_30px_rgba(47,188,230,0.12)]"
                    : "border-slate-200 bg-white hover:border-cyan-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-slate-950">Энгийн хэрэглэгч</div>
                    <p className="mt-1 text-sm text-slate-500">
                      Шууд дансаа нээгээд зураг, видео, аудио үүсгэж эхэлнэ.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Шууд эхэлнэ
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetFeedback();
                  if (requestedRole !== "agent") {
                    setRequestedRole("agent");
                  }
                  setSignupStep(1);
                }}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  requestedRole === "agent"
                    ? "brand-shell text-white"
                    : "border-slate-200 bg-white hover:border-cyan-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={`text-base font-bold ${
                        requestedRole === "agent" ? "text-white" : "text-slate-950"
                      }`}
                    >
                      Агент
                    </div>
                    <p
                      className={`mt-1 text-sm ${
                        requestedRole === "agent" ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      Төлбөрийн баталгаажуулалттай onboarding урсгал. Зөвшөөрөгдвөл{" "}
                      {formatNumber(AGENT_APPROVAL_CREDITS)} кредит болон Хичээл tab нээгдэнэ.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      requestedRole === "agent"
                        ? "bg-white/10 text-cyan-100"
                        : "bg-cyan-50 text-cyan-700"
                    }`}
                  >
                    {formatMnt(AGENT_SIGNUP_PRICE_MNT)}
                  </span>
                </div>
              </button>
            </div>
          </div>
        ) : null}

        {!isProfileStep ? (
          <>
            <label className="block">
              <div className="mb-2 text-sm font-semibold text-slate-700">Имэйл</div>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                placeholder="name@example.com"
                required
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-semibold text-slate-700">Нууц үг</div>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                placeholder="Хамгийн багадаа 6 тэмдэгт"
                required
              />
            </label>

            {mode === "signup" ? (
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-slate-700">Нууц үг давтах</div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  required
                />
              </label>
            ) : null}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-semibold text-slate-700">Бүртгэлийн мэдээлэл</div>
              <div className="mt-1 text-sm text-slate-500">{email.trim()}</div>
            </div>

            <label className="block">
              <div className="mb-2 text-sm font-semibold text-slate-700">Нэр</div>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                placeholder="Таны нэр"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-semibold text-slate-700">Утасны дугаар</div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                placeholder="+976 99119911"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-semibold text-slate-700">Facebook page хаяг</div>
              <input
                type="text"
                value={facebookPageUrl}
                onChange={(event) => setFacebookPageUrl(event.target.value)}
                className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                placeholder="facebook.com/your-page"
              />
            </label>
          </div>
        )}

        {error ? (
          <div className="rounded-[1.15rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className={`grid gap-3 ${isProfileStep ? "sm:grid-cols-[0.95fr_1.05fr]" : ""}`}>
          {isProfileStep ? (
            <button
              type="button"
              onClick={() => {
                resetFeedback();
                setSignupStep(1);
              }}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Буцах
            </button>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-[1.2rem] bg-[linear-gradient(135deg,#84E0EF,#2FBCE6_60%,#129FD5)] px-4 py-3.5 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(47,188,230,0.28)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? "Түр хүлээнэ үү..."
              : mode === "login"
                ? "Нэвтрэх"
                : isRegularUserSignup && signupStep === 1
                  ? "Үргэлжлүүлэх"
                  : "Бүртгэл үүсгэх"}
          </button>
        </div>
      </form>
    </div>
  );
}
