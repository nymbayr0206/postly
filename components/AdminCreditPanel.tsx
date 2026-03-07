"use client";

import { useState } from "react";

type Status = "pending" | "approved" | "rejected";

interface CreditRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  credits: number;
  bonusCredits: number;
  price: number;
  screenshotUrl?: string;
  note?: string;
  status: Status;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const todayIso = new Date().toISOString();
const yesterdayIso = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgoIso = new Date(Date.now() - 2 * 86400000).toISOString();

const MOCK_REQUESTS: CreditRequest[] = [
  {
    id: "REQ-M3X9ZK",
    userId: "u1",
    userName: "Болд Гантулга",
    userEmail: "bold.gantulga@gmail.com",
    credits: 500,
    bonusCredits: 50,
    price: 44900,
    note: "Марны эхний 7 хоногт ашиглана",
    status: "pending",
    createdAt: todayIso,
    updatedAt: todayIso,
  },
  {
    id: "REQ-P5R2TU",
    userId: "u2",
    userName: "Энхжаргал Д",
    userEmail: "enkhjargal.d@outlook.com",
    credits: 1000,
    bonusCredits: 150,
    price: 79900,
    note: "",
    status: "pending",
    createdAt: todayIso,
    updatedAt: todayIso,
  },
  {
    id: "REQ-R8T3VW",
    userId: "u3",
    userName: "Даваасүрэн Б",
    userEmail: "davaasuren.b@gmail.com",
    credits: 2000,
    bonusCredits: 400,
    price: 149900,
    note: "",
    status: "pending",
    createdAt: todayIso,
    updatedAt: todayIso,
  },
  {
    id: "REQ-H7Q4WV",
    userId: "u4",
    userName: "Нарантуяа Ц",
    userEmail: "narantsetseg@postly.mn",
    credits: 100,
    bonusCredits: 0,
    price: 9900,
    note: "Туршилтын хүсэлт",
    status: "approved",
    createdAt: todayIso,
    updatedAt: todayIso,
  },
  {
    id: "REQ-J2L6YZ",
    userId: "u5",
    userName: "Мөнхжин Ц",
    userEmail: "munkhjin.ts@company.mn",
    credits: 500,
    bonusCredits: 50,
    price: 44900,
    note: "Urgently needed for project deadline",
    status: "approved",
    createdAt: todayIso,
    updatedAt: todayIso,
  },
  {
    id: "REQ-K9S1XY",
    userId: "u6",
    userName: "Цэрэнпунцаг М",
    userEmail: "tserenpuntsag@gmail.com",
    credits: 2000,
    bonusCredits: 400,
    price: 149900,
    note: "",
    status: "rejected",
    rejectionReason: "Буруу дансны дугаар",
    createdAt: yesterdayIso,
    updatedAt: yesterdayIso,
  },
  {
    id: "REQ-L4N8PQ",
    userId: "u7",
    userName: "Ганбаатар О",
    userEmail: "ganbaaatar.o@gmail.com",
    credits: 200,
    bonusCredits: 0,
    price: 18900,
    note: "",
    status: "approved",
    createdAt: twoDaysAgoIso,
    updatedAt: twoDaysAgoIso,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatPrice(amount: number) {
  return "₮" + amount.toLocaleString("mn-MN");
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash += userId.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const STATUS_CONFIG: Record<Status, { bg: string; text: string; border: string; label: string; dot: string }> = {
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    label: "Хүлээгдэж буй",
    dot: "bg-yellow-400",
  },
  approved: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    label: "Зөвшөөрсөн",
    dot: "bg-green-500",
  },
  rejected: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "Татгалзсан",
    dot: "bg-red-500",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ReceiptPlaceholder({ seed }: { seed: string }) {
  const hue = [250, 200, 160, 320, 40][seed.charCodeAt(4) % 5];
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl"
      style={{ background: `hsla(${hue},50%,96%,1)`, border: `1px dashed hsla(${hue},50%,75%,1)` }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-8 h-8"
        style={{ color: `hsla(${hue},50%,65%,1)` }}
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
      <p className="text-xs font-medium" style={{ color: `hsla(${hue},50%,55%,1)` }}>
        Зураг байхгүй
      </p>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: CreditRequest;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function handleReject() {
    onReject(request.id, reason);
    setRejecting(false);
    setReason("");
  }

  const color = avatarColor(request.userId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Хүсэлтийн дэлгэрэнгүй</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{request.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* User info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${color}`}>
              {getInitials(request.userName)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{request.userName}</p>
              <p className="text-sm text-gray-500">{request.userEmail}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{request.userId}</p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={request.status} />
            </div>
          </div>

          {/* Credit package details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-xs text-purple-500 mb-1">Кредит</p>
              <p className="text-2xl font-bold text-purple-700">{request.credits.toLocaleString()}</p>
              <p className="text-xs text-purple-400 mt-0.5">кредит</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-xs text-green-500 mb-1">Бонус</p>
              <p className="text-2xl font-bold text-green-700">
                {request.bonusCredits > 0 ? `+${request.bonusCredits.toLocaleString()}` : "—"}
              </p>
              <p className="text-xs text-green-400 mt-0.5">{request.bonusCredits > 0 ? "кредит" : ""}</p>
            </div>
          </div>

          {/* Info rows */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            {[
              { label: "Төлбөрийн дүн", value: formatPrice(request.price), valueClass: "font-semibold text-gray-900" },
              { label: "Нийт кредит", value: `${(request.credits + request.bonusCredits).toLocaleString()} кредит`, valueClass: "font-medium text-gray-900" },
              { label: "Хүсэлт гаргасан", value: formatDate(request.createdAt), valueClass: "text-gray-600" },
              ...(request.status !== "pending"
                ? [{ label: "Шийдвэрлэсэн", value: formatDate(request.updatedAt), valueClass: "text-gray-600" }]
                : []),
              ...(request.rejectionReason
                ? [{ label: "Татгалзсан шалтгаан", value: request.rejectionReason, valueClass: "text-red-600" }]
                : []),
            ].map(({ label, value, valueClass }, i, arr) => (
              <div
                key={label}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < arr.length - 1 ? "border-b border-gray-100" : ""
                } ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              >
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm text-right ${valueClass}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          {request.note && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-medium text-blue-500 mb-1.5">Хэрэглэгчийн тайлбар</p>
              <p className="text-sm text-blue-800">{request.note}</p>
            </div>
          )}

          {/* Screenshot */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Банкны шилжүүлгийн зураг</p>
            <div className="w-full rounded-xl overflow-hidden" style={{ minHeight: "200px" }}>
              {request.screenshotUrl ? (
                <img
                  src={request.screenshotUrl}
                  alt="Төлбөрийн баримт"
                  className="w-full object-contain rounded-xl"
                />
              ) : (
                <div style={{ height: "200px" }}>
                  <ReceiptPlaceholder seed={request.id} />
                </div>
              )}
            </div>
          </div>

          {/* Reject reason input */}
          {rejecting && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm font-medium text-red-700 mb-2">Татгалзах шалтгаан (заавал биш)</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Жишээ: Буруу дансны дугаар, Зураг тодорхойгүй..."
                rows={3}
                className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white resize-none"
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {request.status === "pending" ? (
            rejecting ? (
              <div className="flex gap-2.5">
                <button
                  onClick={() => { setRejecting(false); setReason(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Буцах
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Татгалзахыг баталгаажуулах
                </button>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <button
                  onClick={() => { onApprove(request.id); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Зөвшөөрөх
                </button>
                <button
                  onClick={() => setRejecting(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Татгалзах
                </button>
              </div>
            )
          ) : (
            <div
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border ${STATUS_CONFIG[request.status].bg} ${STATUS_CONFIG[request.status].text} ${STATUS_CONFIG[request.status].border}`}
            >
              {request.status === "approved" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              )}
              {STATUS_CONFIG[request.status].label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type FilterKey = "all" | Status;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Бүгд" },
  { key: "pending", label: "Хүлээгдэж буй" },
  { key: "approved", label: "Зөвшөөрсөн" },
  { key: "rejected", label: "Татгалзсан" },
];

export default function AdminCreditPanel({
  initialRequests,
}: {
  initialRequests?: CreditRequest[];
}) {
  const [requests, setRequests] = useState<CreditRequest[]>(
    initialRequests ?? MOCK_REQUESTS
  );
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null);

  // Stats
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedTodayCount = requests.filter(
    (r) => r.status === "approved" && isToday(r.updatedAt)
  ).length;
  const totalCreditedToday = requests
    .filter((r) => r.status === "approved" && isToday(r.updatedAt))
    .reduce((sum, r) => sum + r.credits + r.bonusCredits, 0);

  const counts: Record<FilterKey, number> = {
    all: requests.length,
    pending: pendingCount,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  function approve(id: string) {
    const now = new Date().toISOString();
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "approved", updatedAt: now } : r
      )
    );
  }

  function reject(id: string, reason: string) {
    const now = new Date().toISOString();
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "rejected", rejectionReason: reason || undefined, updatedAt: now }
          : r
      )
    );
    setSelectedRequest(null);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Кредит хүсэлтүүд</h1>
        <p className="text-sm text-gray-500">Хэрэглэгчдийн кредит цэнэглэх хүсэлтүүдийг удирдах</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Pending */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Хүлээгдэж буй</p>
              <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-xs text-gray-400 mt-1">хүсэлт</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs text-yellow-600 font-medium">Шийдвэрлэхийг хүлээж буй</span>
            </div>
          )}
        </div>

        {/* Approved today */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Өнөөдөр зөвшөөрсөн</p>
              <p className="text-3xl font-bold text-gray-900">{approvedTodayCount}</p>
              <p className="text-xs text-gray-400 mt-1">хүсэлт</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total credited today */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Өнөөдөр нэмсэн кредит</p>
              <p className="text-3xl font-bold text-gray-900">{totalCreditedToday.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">нийт кредит</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="22" height="16" x="1" y="4" rx="2" ry="2" />
                <line x1="1" x2="23" y1="10" y2="10" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {/* Filter tabs */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    filter === key ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full text-sm font-medium text-yellow-700">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              {pendingCount} шийдвэрлэхийг хүлээж буй
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect width="6" height="4" x="9" y="3" rx="1" ry="1" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Хүсэлт олдсонгүй</p>
            </div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Хэрэглэгч
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Кредит
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Төлбөр
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Огноо
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Үйлдэл
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((req) => {
                  const color = avatarColor(req.userId);
                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${color}`}
                          >
                            {getInitials(req.userName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{req.userName}</p>
                            <p className="text-xs text-gray-400 truncate">{req.userEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* Credits */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {req.credits.toLocaleString()}
                        </p>
                        {req.bonusCredits > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            +{req.bonusCredits.toLocaleString()} бонус
                          </p>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatPrice(req.price)}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-600">{formatDate(req.createdAt)}</p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          Харах
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <DetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={(id) => {
            approve(id);
            setSelectedRequest((prev) =>
              prev?.id === id ? { ...prev, status: "approved", updatedAt: new Date().toISOString() } : prev
            );
          }}
          onReject={reject}
        />
      )}
    </div>
  );
}
