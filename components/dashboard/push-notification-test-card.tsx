"use client";

import { useEffect, useState } from "react";

import {
  detectPushSupport,
  getClientDevicePlatform,
  getNotificationPermissionState,
  getPublicVapidKey,
  type PushSupportState,
  urlBase64ToUint8Array,
} from "@/lib/push/support";

type NoticeTone = "info" | "success" | "error";

type NoticeState = {
  tone: NoticeTone;
  text: string;
};

function formatPermission(permission: string) {
  if (permission === "granted") {
    return "Зөвшөөрсөн";
  }

  if (permission === "denied") {
    return "Хаасан";
  }

  if (permission === "default") {
    return "Шийдээгүй";
  }

  return "Дэмжигдэхгүй";
}

function statusBadgeClasses(isPositive: boolean) {
  return isPositive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function noticeClasses(tone: NoticeTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

export function PushNotificationTestCard() {
  const [support, setSupport] = useState<PushSupportState>(() => detectPushSupport());
  const [permission, setPermission] = useState(() => getNotificationPermissionState());
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("Шалгаж байна...");
  const [subscriptionStatus, setSubscriptionStatus] = useState("Шалгаж байна...");
  const [lastTestResult, setLastTestResult] = useState("Одоогоор туршилт хийгдээгүй.");
  const [notice, setNotice] = useState<NoticeState>({
    tone: "info",
    text: "Push дэмжлэг болон service worker төлөвийг шалгаж байна.",
  });
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);

  async function syncBrowserState() {
    const nextSupport = detectPushSupport();
    setSupport(nextSupport);
    setPermission(getNotificationPermissionState());

    if (!nextSupport.hasRequiredApis) {
      setServiceWorkerStatus("Энэ хөтөч service worker болон Push API дэмжихгүй байна.");
      setSubscriptionStatus("Push subscription үүсгэх боломжгүй.");
      return null;
    }

    if (!nextSupport.isSecureContext) {
      setServiceWorkerStatus("HTTPS эсвэл localhost орчин шаардлагатай.");
      setSubscriptionStatus("Аюулгүй орчин бүрдээгүй байна.");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      setServiceWorkerStatus("Амжилттай бүртгэгдсэн.");

      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        setSubscriptionEndpoint(existingSubscription.endpoint);
        setSubscriptionStatus("Хөтөч дээр push subscription бэлэн байна.");
      } else {
        setSubscriptionEndpoint(null);
        setSubscriptionStatus("Хөтөч дээр push subscription үүсээгүй байна.");
      }

      return registration;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Service worker бүртгэх үед тодорхойгүй алдаа гарлаа.";
      setServiceWorkerStatus(`Service worker бүртгэж чадсангүй: ${message}`);
      setSubscriptionStatus("Service worker бүртгэлгүй тул push боломжгүй.");
      return null;
    }
  }

  useEffect(() => {
    void syncBrowserState();
  }, []);

  async function handleRequestPermission() {
    const nextSupport = detectPushSupport();
    setSupport(nextSupport);

    if (!nextSupport.hasRequiredApis) {
      setNotice({
        tone: "error",
        text: "Энэ төхөөрөмж Push API, Notification API эсвэл service worker дэмжихгүй байна.",
      });
      return;
    }

    if (!nextSupport.isSecureContext) {
      setNotice({
        tone: "error",
        text: "Push мэдэгдэл зөвхөн HTTPS эсвэл localhost орчинд ажиллана.",
      });
      return;
    }

    if (nextSupport.isAppleMobile && !nextSupport.isStandalone) {
      setNotice({
        tone: "error",
        text: "iPhone, iPad дээр мэдэгдэл зөвшөөрөхийн тулд сайтыг Нүүр дэлгэц рүү нэмээд тэндээс нээнэ үү.",
      });
      return;
    }

    setIsPermissionLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        setNotice({
          tone: "success",
          text: "Мэдэгдлийн зөвшөөрөл амжилттай олгогдлоо.",
        });
      } else if (result === "denied") {
        setNotice({
          tone: "error",
          text: "Мэдэгдлийн зөвшөөрлийг хаасан байна. Хөтчийн тохиргооноос зөвшөөрнө үү.",
        });
      } else {
        setNotice({
          tone: "info",
          text: "Мэдэгдлийн зөвшөөрөл одоогоор шийдэгдээгүй байна.",
        });
      }
    } finally {
      setIsPermissionLoading(false);
    }
  }

  async function handleSubscribe() {
    const nextSupport = detectPushSupport();
    setSupport(nextSupport);

    if (!nextSupport.hasRequiredApis) {
      setNotice({
        tone: "error",
        text: "Энэ төхөөрөмж Push API дэмжихгүй байна.",
      });
      return;
    }

    if (!nextSupport.isSupported) {
      setNotice({
        tone: "error",
        text: nextSupport.isAppleMobile
          ? "iPhone, iPad дээр төхөөрөмж бүртгэхийн тулд суулгасан Home Screen app дотроос нээнэ үү."
          : "Push орчин бүрдээгүй байна.",
      });
      return;
    }

    const vapidPublicKey = getPublicVapidKey();

    if (!vapidPublicKey) {
      setNotice({
        tone: "error",
        text: "NEXT_PUBLIC_VAPID_PUBLIC_KEY тохируулагдаагүй байна.",
      });
      return;
    }

    setIsSubscribeLoading(true);

    try {
      const registration = await syncBrowserState();

      if (!registration) {
        setNotice({
          tone: "error",
          text: "Service worker бүртгэлгүй тул төхөөрөмж бүртгэж чадсангүй.",
        });
        return;
      }

      let currentPermission = Notification.permission;

      if (currentPermission !== "granted") {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);
      }

      if (currentPermission !== "granted") {
        setNotice({
          tone: "error",
          text: "Мэдэгдлийн зөвшөөрөлгүй тул төхөөрөмж бүртгэж чадсангүй.",
        });
        return;
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          appInstalled: nextSupport.isStandalone,
          devicePlatform: getClientDevicePlatform(),
        }),
      });

      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Төхөөрөмж бүртгэх хүсэлт амжилтгүй боллоо.");
      }

      setSubscriptionEndpoint(subscription.endpoint);
      setSubscriptionStatus("Supabase дээр амжилттай хадгалагдсан.");
      setNotice({
        tone: "success",
        text: result.message ?? "Төхөөрөмж амжилттай бүртгэгдлээ.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Push subscription үүсгэх үед алдаа гарлаа.";

      setSubscriptionStatus(`Subscription амжилтгүй: ${message}`);
      setNotice({
        tone: "error",
        text: `Төхөөрөмж бүртгэж чадсангүй: ${message}`,
      });
    } finally {
      setIsSubscribeLoading(false);
    }
  }

  async function handleTestPush() {
    setIsTestLoading(true);

    try {
      const registration = await syncBrowserState();

      if (!registration) {
        setLastTestResult("Service worker бүртгэлгүй байна.");
        setNotice({
          tone: "error",
          text: "Service worker бүртгэлгүй тул туршилтын мэдэгдэл илгээж чадсангүй.",
        });
        return;
      }

      const subscription = (await registration.pushManager.getSubscription()) ?? null;
      const endpoint = subscription?.endpoint ?? subscriptionEndpoint;

      if (!endpoint) {
        setLastTestResult("Энэ төхөөрөмж дээр push subscription олдсонгүй.");
        setNotice({
          tone: "error",
          text: "Эхлээд төхөөрөмжөө бүртгэнэ үү.",
        });
        return;
      }

      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint }),
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
        stale?: boolean;
      };

      if (!response.ok) {
        if (result.stale) {
          setSubscriptionEndpoint(null);
          setSubscriptionStatus("Хүчингүй endpoint цэвэрлэгдсэн. Дахин бүртгэнэ үү.");
        }

        throw new Error(result.error ?? "Туршилтын мэдэгдэл илгээж чадсангүй.");
      }

      setLastTestResult(result.message ?? "Туршилтын мэдэгдэл амжилттай илгээгдлээ.");
      setNotice({
        tone: "success",
        text: "Туршилтын мэдэгдэл илгээгдлээ. Утсан дээр system notification шалгана уу.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Туршилтын мэдэгдэл илгээх үед алдаа гарлаа.";

      setLastTestResult(message);
      setNotice({
        tone: "error",
        text: message,
      });
    } finally {
      setIsTestLoading(false);
    }
  }

  const supportSummary = [
    {
      label: "Хөтөчийн дэмжлэг",
      value: support.isSupported ? "Дэмжигдсэн" : "Дутуу",
      positive: support.isSupported,
    },
    {
      label: "Зөвшөөрлийн төлөв",
      value: formatPermission(permission),
      positive: permission === "granted",
    },
    {
      label: "Service worker",
      value: serviceWorkerStatus,
      positive: serviceWorkerStatus.includes("Амжилттай"),
    },
    {
      label: "Push subscription",
      value: subscriptionStatus,
      positive:
        subscriptionStatus.includes("бэлэн") ||
        subscriptionStatus.includes("хадгалагдсан"),
    },
    {
      label: "Суулгасан горим",
      value: support.isStandalone ? "Суулгасан app" : "Хөтчийн tab",
      positive: support.isStandalone,
    },
    {
      label: "Сүүлийн туршилт",
      value: lastTestResult,
      positive: lastTestResult.includes("амжилттай"),
    },
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
          Мэдэгдлийн туршилт
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Мэдэгдлийн туршилт
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Доорх алхмуудаар permission, service worker, push subscription болон
          серверийн илгээж буй туршилтын мэдэгдлийг шалгана.
        </p>
      </div>

      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className={`rounded-2xl border px-4 py-3 text-sm ${noticeClasses(notice.tone)}`}>
            {notice.text}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {supportSummary.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border px-4 py-3 ${statusBadgeClasses(item.positive)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-medium leading-6">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isPermissionLoading}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPermissionLoading ? "Зөвшөөрөл шалгаж байна..." : "Мэдэгдэл зөвшөөрөх"}
            </button>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isSubscribeLoading}
              className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
            >
              {isSubscribeLoading ? "Төхөөрөмж бүртгэж байна..." : "Төхөөрөмжийг бүртгэх"}
            </button>
            <button
              type="button"
              onClick={handleTestPush}
              disabled={isTestLoading}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {isTestLoading ? "Мэдэгдэл илгээж байна..." : "Туршилтын мэдэгдэл авах"}
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Тусламж
          </p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Хэрэв хөтөч push дэмжихгүй байвал Android Chrome эсвэл суулгасан PWA
              горим ашиглана.
            </p>
            <p>
              Permission хаалттай бол хөтчийн тохиргооноос мэдэгдлийг дахин
              зөвшөөрөх шаардлагатай.
            </p>
            <p>
              iPhone, iPad дээр Safari tab дотор бус, Нүүр дэлгэц дээр суулгасан
              app дотроос нээж туршина.
            </p>
            <p>
              Endpoint хүчингүй болсон бол сервер stale subscription-ийг автоматаар
              устгаад дахин бүртгэхийг санал болгоно.
            </p>
            {subscriptionEndpoint ? (
              <p className="break-all rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                Одоогийн endpoint: {subscriptionEndpoint}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
