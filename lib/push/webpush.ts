import webpush from "web-push";
import { z } from "zod";

import type { PushNotificationPayload, PushSubscriptionRow } from "@/lib/types";

const pushPayloadSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  url: z.string().trim().min(1).optional(),
  icon: z.string().trim().min(1).optional(),
  badge: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
});

let vapidConfigured = false;

function readEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Push орчны хувьсагч алга: ${name}`);
  }

  return value;
}

function getWebPushEnv() {
  return {
    publicKey: readEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    privateKey: readEnv("VAPID_PRIVATE_KEY"),
    subject: readEnv("VAPID_SUBJECT"),
  };
}

function ensureWebPushConfigured() {
  if (vapidConfigured) {
    return;
  }

  const { publicKey, privateKey, subject } = getWebPushEnv();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function normalizePushPayload(payload: PushNotificationPayload) {
  return pushPayloadSchema.parse(payload);
}

export function toWebPushSubscription(
  subscription: Pick<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">,
) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

export async function sendWebPushNotification(
  subscription: Pick<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">,
  payload: PushNotificationPayload,
) {
  ensureWebPushConfigured();

  return webpush.sendNotification(
    toWebPushSubscription(subscription),
    JSON.stringify(normalizePushPayload(payload)),
  );
}

export function isStalePushSubscriptionError(error: unknown) {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : null;

  return statusCode === 404 || statusCode === 410;
}
