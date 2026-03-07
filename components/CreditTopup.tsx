"use client";

import { useState, useRef } from "react";

const PACKAGES = [
  { credits: 100, price: "₮9,900", bonus: 0 },
  { credits: 500, price: "₮44,900", bonus: 50 },
  { credits: 1000, price: "₮79,900", bonus: 150 },
  { credits: 2000, price: "₮149,900", bonus: 400 },
] as const;

type Pkg = (typeof PACKAGES)[number];

const BANK = {
  bank: "Хаан Банк",
  account: "5000-1234-5678",
  recipient: "Postly ХХК",
};

function genRef() {
  return (
    "REQ-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

const STEPS = ["Хэмжээ сонгох", "Төлбөр хийх", "Баталгаажуулалт"];

export default function CreditTopup({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedPkg, setSelectedPkg] = useState<Pkg | null>(null);
  const [customCredits, setCustomCredits] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");
  const [reqRef, setReqRef] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openModal(pkg?: Pkg) {
    if (pkg) setSelectedPkg(pkg);
    setCustomCredits(pkg ? "" : customCredits);
    setStep(1);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setTimeout(() => {
      setStep(1);
      setSelectedPkg(null);
      setCustomCredits("");
      setFile(null);
      setPreview("");
      setNote("");
      setReqRef("");
    }, 350);
  }

  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  const credits = (selectedPkg?.credits ?? parseInt(customCredits)) || 0;
  const bonus = selectedPkg?.bonus ?? 0;
  const price = selectedPkg
    ? selectedPkg.price
    : credits > 0
    ? `₮${(credits * 99).toLocaleString()}`
    : "—";

  const canStep2 = selectedPkg !== null || parseInt(customCredits) > 0;
  const canSubmit = file !== null;

  function submit() {
    setReqRef(genRef());
    setStep(3);
  }

  return (
    <>
      {/* ── Package Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.credits}
            onClick={() => openModal(pkg)}
            className="bg-white rounded-2xl border border-gray-200 hover:border-purple-400 hover:shadow-md transition p-5 text-center cursor-pointer group"
          >
            <p className="text-3xl font-bold text-gray-900 mb-1">{pkg.credits}</p>
            <p className="text-xs text-gray-500 mb-2">Кредит</p>
            {pkg.bonus > 0 && (
              <span className="inline-block bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full mb-3">
                +{pkg.bonus} урамшуулал
              </span>
            )}
            <p className="text-lg font-semibold text-gray-900 mb-4">{pkg.price}</p>
            <div className="w-full bg-purple-600 group-hover:bg-purple-700 text-white text-sm font-medium py-2 rounded-xl transition">
              Худалдаж авах
            </div>
          </div>
        ))}
      </div>

      {/* Custom amount trigger */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => {
            setSelectedPkg(null);
            setCustomCredits("");
            setStep(1);
            setOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-purple-600 border border-purple-200 hover:bg-purple-50 rounded-xl transition"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Өөр хэмжээ оруулах
        </button>
      </div>

      {/* ── Modal Overlay ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal card */}
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "#18181f", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div>
                <h2 className="text-white font-semibold">Кредит нэмэх</h2>
                <div className="flex items-center mt-1 text-xs">
                  {STEPS.map((label, i) => (
                    <span key={i} className="flex items-center">
                      {i > 0 && (
                        <span className="mx-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                          →
                        </span>
                      )}
                      <span
                        style={{
                          color:
                            step === i + 1
                              ? "#c084fc"
                              : step > i + 1
                              ? "#4ade80"
                              : "rgba(255,255,255,0.28)",
                          fontWeight: step === i + 1 ? 600 : 400,
                        }}
                      >
                        {label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-lg transition"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                }
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ height: "2px", background: "rgba(255,255,255,0.06)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(step / 3) * 100}%`,
                  background: "#a855f7",
                  transition: "width 0.45s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </div>

            <div className="p-6">
              {/* ─── Step 1: Choose Amount ─── */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Нэмэх кредитийн хэмжээг сонгоно уу
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    {PACKAGES.map((pkg) => (
                      <button
                        key={pkg.credits}
                        onClick={() => {
                          setSelectedPkg(pkg);
                          setCustomCredits("");
                        }}
                        className="relative p-3.5 rounded-xl text-left transition-all"
                        style={{
                          background:
                            selectedPkg?.credits === pkg.credits
                              ? "rgba(168,85,247,0.12)"
                              : "rgba(255,255,255,0.04)",
                          border: `1px solid ${
                            selectedPkg?.credits === pkg.credits
                              ? "#a855f7"
                              : "rgba(255,255,255,0.1)"
                          }`,
                        }}
                      >
                        {selectedPkg?.credits === pkg.credits && (
                          <span
                            className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: "#a855f7" }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </span>
                        )}
                        <p className="text-xl font-bold text-white">{pkg.credits}</p>
                        <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                          кредит
                        </p>
                        {pkg.bonus > 0 && (
                          <span
                            className="inline-block text-xs px-1.5 py-0.5 rounded-full mb-1.5"
                            style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}
                          >
                            +{pkg.bonus}
                          </span>
                        )}
                        <p className="text-sm font-semibold" style={{ color: "#c084fc" }}>
                          {pkg.price}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Custom amount */}
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Эсвэл өөрийн хэмжээ оруулах
                    </p>
                    <div
                      className="flex items-center rounded-xl px-3 py-2.5"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <input
                        type="number"
                        min={10}
                        placeholder="Кредитийн тоо"
                        value={customCredits}
                        onChange={(e) => {
                          setCustomCredits(e.target.value);
                          setSelectedPkg(null);
                        }}
                        className="flex-1 bg-transparent text-white text-sm outline-none"
                        style={{ color: "white" }}
                      />
                      <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                        кредит
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!canStep2}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                    style={{
                      background: canStep2 ? "#a855f7" : "rgba(168,85,247,0.25)",
                      cursor: canStep2 ? "pointer" : "not-allowed",
                    }}
                  >
                    Үргэлжлүүлэх →
                  </button>
                </div>
              )}

              {/* ─── Step 2: Bank Info + Upload ─── */}
              {step === 2 && (
                <div className="space-y-3.5">
                  {/* Summary pill */}
                  <div
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      background: "rgba(168,85,247,0.1)",
                      border: "1px solid rgba(168,85,247,0.25)",
                    }}
                  >
                    <div>
                      <p className="text-white font-semibold text-sm">{credits} кредит</p>
                      {bonus > 0 && (
                        <p className="text-xs" style={{ color: "#4ade80" }}>
                          +{bonus} урамшуулал
                        </p>
                      )}
                    </div>
                    <p className="font-bold" style={{ color: "#c084fc" }}>
                      {price}
                    </p>
                  </div>

                  {/* Bank info */}
                  <div
                    className="p-3.5 rounded-xl space-y-2.5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p
                      className="text-xs font-medium tracking-wider uppercase"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Банкны мэдээлэл
                    </p>
                    {[
                      ["Банк", BANK.bank],
                      ["Дансны дугаар", BANK.account],
                      ["Хүлээн авагч", BANK.recipient],
                    ].map(([label, val]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {label}
                        </span>
                        <span className="text-xs font-mono font-semibold text-white">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Warning */}
                  <div
                    className="flex gap-2.5 p-3 rounded-xl"
                    style={{
                      background: "rgba(251,191,36,0.07)",
                      border: "1px solid rgba(251,191,36,0.2)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "#fbbf24" }}
                    >
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <path d="M12 9v4M12 17h.01" />
                    </svg>
                    <p className="text-xs leading-relaxed" style={{ color: "#fde68a" }}>
                      Гүйлгээний тайлбарт <strong>таны имэйл</strong>-ийг заавал бичнэ үү:{" "}
                      <span className="font-mono font-bold">{userEmail ?? "email@example.com"}</span>
                    </p>
                  </div>

                  {/* File upload */}
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Төлбөрийн баримт (зураг) <span style={{ color: "#f87171" }}>*</span>
                    </p>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDrag(true);
                      }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDrag(false);
                        const f = e.dataTransfer.files[0];
                        if (f) handleFile(f);
                      }}
                      onClick={() => fileRef.current?.click()}
                      className="cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-5 transition-all"
                      style={{
                        borderColor: drag
                          ? "#a855f7"
                          : preview
                          ? "rgba(74,222,128,0.4)"
                          : "rgba(255,255,255,0.12)",
                        background: drag
                          ? "rgba(168,85,247,0.07)"
                          : preview
                          ? "rgba(74,222,128,0.04)"
                          : "rgba(255,255,255,0.025)",
                      }}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFile(f);
                        }}
                      />
                      {preview ? (
                        <div className="flex flex-col items-center gap-2">
                          <img
                            src={preview}
                            alt="Receipt"
                            className="max-h-24 rounded-lg object-contain"
                          />
                          <p className="text-xs" style={{ color: "#4ade80" }}>
                            {file?.name}
                          </p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                            Солихын тулд дарна уу
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="w-8 h-8"
                            style={{ color: "rgba(255,255,255,0.2)" }}
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                            Зураг чирж оруулах эсвэл дарна уу
                          </p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                            PNG, JPG, WEBP дэмжинэ
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional note */}
                  <div>
                    <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Нэмэлт тайлбар (заавал биш)
                    </p>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Нэмэлт мэдээлэл..."
                      className="w-full rounded-xl p-2.5 text-sm resize-none outline-none text-white transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    />
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 rounded-xl text-sm transition"
                      style={{
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      ← Буцах
                    </button>
                    <button
                      onClick={submit}
                      disabled={!canSubmit}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                      style={{
                        background: canSubmit ? "#a855f7" : "rgba(168,85,247,0.25)",
                        cursor: canSubmit ? "pointer" : "not-allowed",
                      }}
                    >
                      Хүсэлт илгээх
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Step 3: Success ─── */}
              {step === 3 && (
                <div className="text-center space-y-4 py-2">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                    style={{
                      background: "rgba(74,222,128,0.14)",
                      border: "1px solid rgba(74,222,128,0.3)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-8 h-8"
                      style={{ color: "#4ade80" }}
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-white font-bold text-lg">Хүсэлт илгээгдлээ!</h3>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Таны кредит нэмэх хүсэлтийг хүлээн авлаа
                    </p>
                  </div>

                  <div
                    className="p-4 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p className="text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Хүсэлтийн дугаар
                    </p>
                    <p className="font-mono font-bold text-base" style={{ color: "#c084fc" }}>
                      {reqRef}
                    </p>
                  </div>

                  <div
                    className="flex items-start gap-2 p-3 rounded-xl text-left"
                    style={{
                      background: "rgba(59,130,246,0.07)",
                      border: "1px solid rgba(59,130,246,0.2)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "#60a5fa" }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    <p className="text-xs leading-relaxed" style={{ color: "#93c5fd" }}>
                      Хянах хугацаа:{" "}
                      <strong className="text-white">1–3 ажлын өдөр</strong>. Баталгаажсны дараа
                      кредит таны данс руу автоматаар нэмэгдэнэ.
                    </p>
                  </div>

                  <button
                    onClick={close}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: "#a855f7" }}
                  >
                    Хаах
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
