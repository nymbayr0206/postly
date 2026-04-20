export type PushSupportState = {
  hasWindow: boolean;
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  hasRequiredApis: boolean;
  isAppleMobile: boolean;
  isStandalone: boolean;
  isSupported: boolean;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
  userAgentData?: {
    platform?: string;
  };
};

function hasWindowObject() {
  return typeof window !== "undefined";
}

export function detectPushSupport(): PushSupportState {
  if (!hasWindowObject()) {
    return {
      hasWindow: false,
      isSecureContext: false,
      hasServiceWorker: false,
      hasPushManager: false,
      hasNotification: false,
      hasRequiredApis: false,
      isAppleMobile: false,
      isStandalone: false,
      isSupported: false,
    };
  }

  const nav = navigator as NavigatorWithStandalone;
  const userAgent = nav.userAgent || "";
  const isAppleMobile = /iphone|ipad|ipod/i.test(userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    document.referrer.startsWith("android-app://");
  const isSecure = window.isSecureContext || window.location.hostname === "localhost";
  const hasServiceWorker = "serviceWorker" in navigator;
  const hasPushManager = "PushManager" in window;
  const hasNotification = "Notification" in window;
  const hasRequiredApis = hasServiceWorker && hasPushManager && hasNotification;
  const isSupported = isSecure && hasRequiredApis && (!isAppleMobile || isStandalone);

  return {
    hasWindow: true,
    isSecureContext: isSecure,
    hasServiceWorker,
    hasPushManager,
    hasNotification,
    hasRequiredApis,
    isAppleMobile,
    isStandalone,
    isSupported,
  };
}

export function getNotificationPermissionState() {
  if (!hasWindowObject() || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function getPublicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function getClientDevicePlatform() {
  if (!hasWindowObject()) {
    return "unknown";
  }

  const nav = navigator as NavigatorWithStandalone;
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  const normalized = platform.toLowerCase();

  if (normalized.includes("android")) {
    return "android";
  }

  if (normalized.includes("iphone")) {
    return "iphone";
  }

  if (normalized.includes("ipad")) {
    return "ipad";
  }

  if (normalized.includes("mac")) {
    return "macos";
  }

  if (normalized.includes("win")) {
    return "windows";
  }

  return "unknown";
}
