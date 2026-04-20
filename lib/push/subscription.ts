import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { PushSubscriptionRow } from "@/lib/types";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Subscription endpoint буруу байна."),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh түлхүүр алга."),
    auth: z.string().min(1, "auth түлхүүр алга."),
  }),
});

export const pushSubscriptionEnvelopeSchema = z.object({
  subscription: pushSubscriptionSchema,
  appInstalled: z.boolean().optional(),
  devicePlatform: z.string().trim().min(1).optional(),
});

export const pushEndpointSchema = z.object({
  endpoint: z.string().url("Endpoint буруу байна."),
});

export function parsePushSubscriptionRequest(body: unknown) {
  const wrapped = pushSubscriptionEnvelopeSchema.safeParse(body);

  if (wrapped.success) {
    return {
      success: true as const,
      data: {
        subscription: wrapped.data.subscription,
        appInstalled: wrapped.data.appInstalled ?? false,
        devicePlatform: wrapped.data.devicePlatform ?? null,
      },
    };
  }

  const raw = pushSubscriptionSchema.safeParse(body);

  if (raw.success) {
    return {
      success: true as const,
      data: {
        subscription: raw.data,
        appInstalled: false,
        devicePlatform: null,
      },
    };
  }

  return {
    success: false as const,
    error:
      wrapped.error.issues[0]?.message ??
      raw.error.issues[0]?.message ??
      "Push subscription буруу байна.",
  };
}

export function detectDevicePlatformFromUserAgent(userAgent: string | null | undefined) {
  const normalized = userAgent?.toLowerCase() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized.includes("android")) {
    return "android";
  }

  if (normalized.includes("iphone")) {
    return "iphone";
  }

  if (normalized.includes("ipad")) {
    return "ipad";
  }

  if (normalized.includes("mac os")) {
    return "macos";
  }

  if (normalized.includes("windows")) {
    return "windows";
  }

  return "unknown";
}

export async function upsertPushSubscriptionRecord(
  supabase: SupabaseClient,
  input: {
    userId: string | null;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
    devicePlatform: string | null;
    appInstalled: boolean;
  },
) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent,
        device_platform: input.devicePlatform,
        app_installed: input.appInstalled,
      },
      {
        onConflict: "endpoint",
      },
    )
    .select(
      "id,user_id,endpoint,p256dh,auth,user_agent,device_platform,app_installed,created_at,updated_at",
    )
    .single<PushSubscriptionRow>();

  if (error) {
    throw new Error(`Push subscription хадгалж чадсангүй: ${error.message}`);
  }

  return data;
}

export async function deletePushSubscriptionByEndpoint(
  supabase: SupabaseClient,
  endpoint: string,
) {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) {
    throw new Error(`Push subscription устгаж чадсангүй: ${error.message}`);
  }
}

export async function getPushSubscriptionByEndpoint(
  supabase: SupabaseClient,
  endpoint: string,
) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select(
      "id,user_id,endpoint,p256dh,auth,user_agent,device_platform,app_installed,created_at,updated_at",
    )
    .eq("endpoint", endpoint)
    .maybeSingle<PushSubscriptionRow>();

  if (error) {
    throw new Error(`Push subscription ачаалж чадсангүй: ${error.message}`);
  }

  return data ?? null;
}

export async function getLatestPushSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select(
      "id,user_id,endpoint,p256dh,auth,user_agent,device_platform,app_installed,created_at,updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<PushSubscriptionRow>();

  if (error) {
    throw new Error(`Сүүлийн push subscription ачаалж чадсангүй: ${error.message}`);
  }

  return data ?? null;
}
