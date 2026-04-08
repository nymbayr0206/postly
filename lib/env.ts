function readEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Шаардлагатай орчны хувьсагч алга: ${name}`);
  }

  return value;
}

function readEnvAny(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];

    if (value?.trim()) {
      return value;
    }
  }

  throw new Error(`Ð¨Ð°Ð°Ñ€Ð´Ð»Ð°Ð³Ð°Ñ‚Ð°Ð¹ Ð¾Ñ€Ñ‡Ð½Ñ‹ Ñ…ÑƒÐ²ÑŒÑÐ°Ð³Ñ‡ Ð°Ð»Ð³Ð°: ${names.join(" | ")}`);
}

function normalizeOptionalUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

export function getPublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Шаардлагатай орчны хувьсагч алга: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!supabaseAnonKey) {
    throw new Error("Шаардлагатай орчны хувьсагч алга: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { supabaseUrl, supabaseAnonKey };
}

const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const DEFAULT_NANOBANANA_MODEL_NAME = "nano-banana-2";
const DEFAULT_ELEVENLABS_MODEL_NAME = "elevenlabs/text-to-dialogue-v3";
const DEFAULT_RUNWAY_MODEL_NAME = "runway/gen4-turbo";
const DEFAULT_VEO_FAST_MODEL_NAME = "veo3_fast";
const DEFAULT_VEO_MODEL_NAME = "veo3";

export function getNanoBananaEnv() {
  return {
    nanoBananaApiUrl: readEnv("NANOBANANA_API_URL"),
    nanoBananaApiKey: readEnv("NANOBANANA_API_KEY"),
    nanoBananaTimeoutMs: Number(process.env.NANOBANANA_TIMEOUT_MS ?? "180000"),
    nanoBananaModelName: process.env.NANOBANANA_MODEL_NAME ?? DEFAULT_NANOBANANA_MODEL_NAME,
  };
}

export function getElevenLabsEnv() {
  return {
    elevenlabsApiKey: readEnv("ELEVENLABS_API_KEY"),
    elevenlabsApiUrl: KIE_CREATE_TASK_URL,
    elevenlabsTimeoutMs: Number(process.env.ELEVENLABS_TIMEOUT_MS ?? "180000"),
    elevenlabsModelName: DEFAULT_ELEVENLABS_MODEL_NAME,
  };
}

export function getRunwayEnv() {
  return {
    runwayApiKey: readEnvAny(["KIE_API_KEY", "RUNWAY_API_KEY"]),
    runwayGenerateUrl: "https://api.kie.ai/api/v1/runway/generate",
    runwayPollUrl: "https://api.kie.ai/api/v1/runway/record-detail",
    runwayTimeoutMs: Number(process.env.RUNWAY_TIMEOUT_MS ?? "300000"),
    runwayModelName: DEFAULT_RUNWAY_MODEL_NAME,
  };
}

export function getVeoEnv() {
  return {
    veoApiKey: readEnvAny(["KIE_API_KEY", "VEO_API_KEY", "RUNWAY_API_KEY"]),
    veoGenerateUrl: "https://api.kie.ai/api/v1/veo/generate",
    veoExtendUrl: "https://api.kie.ai/api/v1/veo/extend",
    veoPollUrl: "https://api.kie.ai/api/v1/veo/record-info",
    veo1080pUrl: "https://api.kie.ai/api/v1/veo/get-1080p-video",
    veoTimeoutMs: Number(process.env.VEO_TIMEOUT_MS ?? "420000"),
    veoFastModelName: process.env.VEO_FAST_MODEL_NAME ?? DEFAULT_VEO_FAST_MODEL_NAME,
    veoModelName: process.env.VEO_MODEL_NAME ?? DEFAULT_VEO_MODEL_NAME,
  };
}

export function getActiveVideoModelNames() {
  const { runwayModelName } = getRunwayEnv();
  const { veoFastModelName, veoModelName } = getVeoEnv();

  return [runwayModelName, veoFastModelName, veoModelName];
}

export function getQPayEnv() {
  return {
    qpayBaseUrl: normalizeOptionalUrl(process.env.QPAY_BASE_URL) ?? "https://merchant.qpay.mn",
    qpayUsername: readEnv("QPAY_USERNAME"),
    qpayPassword: readEnv("QPAY_PASSWORD"),
    qpayInvoiceCode: readEnv("QPAY_INVOICE_CODE"),
    qpayBranchCode: process.env.QPAY_BRANCH_CODE?.trim() || null,
    qpayStaffCode: process.env.QPAY_STAFF_CODE?.trim() || null,
    qpayCallbackUrl: normalizeOptionalUrl(process.env.QPAY_CALLBACK_URL),
    publicSiteUrl: normalizeOptionalUrl(process.env.NEXT_PUBLIC_SITE_URL),
  };
}

export function getActiveModelNames() {
  return {
    nanoBananaModelName: process.env.NANOBANANA_MODEL_NAME ?? DEFAULT_NANOBANANA_MODEL_NAME,
    elevenlabsModelName: DEFAULT_ELEVENLABS_MODEL_NAME,
    runwayModelName: DEFAULT_RUNWAY_MODEL_NAME,
    veoFastModelName: process.env.VEO_FAST_MODEL_NAME ?? DEFAULT_VEO_FAST_MODEL_NAME,
    veoModelName: process.env.VEO_MODEL_NAME ?? DEFAULT_VEO_MODEL_NAME,
  };
}

export function getServerEnv() {
  return {
    ...getNanoBananaEnv(),
    ...getElevenLabsEnv(),
    ...getRunwayEnv(),
    ...getVeoEnv(),
    ...getQPayEnv(),
  };
}
