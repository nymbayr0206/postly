const serverEnvKeys = ["NANOBANANA_API_URL", "NANOBANANA_API_KEY", "ELEVENLABS_API_KEY", "RUNWAY_API_KEY"] as const;

function readEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Шаардлагатай орчны хувьсагч алга: ${name}`);
  }

  return value;
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

export function getServerEnv() {
  return {
    nanoBananaApiUrl: readEnv(serverEnvKeys[0]),
    nanoBananaApiKey: readEnv(serverEnvKeys[1]),
    nanoBananaTimeoutMs: Number(process.env.NANOBANANA_TIMEOUT_MS ?? "180000"),
    nanoBananaModelName: process.env.NANOBANANA_MODEL_NAME ?? "nano-banana-2",
    elevenlabsApiKey: readEnv(serverEnvKeys[2]),
    elevenlabsApiUrl: KIE_CREATE_TASK_URL,
    elevenlabsTimeoutMs: Number(process.env.ELEVENLABS_TIMEOUT_MS ?? "180000"),
    elevenlabsModelName: "elevenlabs/text-to-dialogue-v3",
    runwayApiKey: readEnv(serverEnvKeys[3]),
    runwayGenerateUrl: "https://api.kie.ai/api/v1/runway/generate",
    runwayPollUrl: "https://api.kie.ai/api/v1/runway/record-detail",
    runwayTimeoutMs: Number(process.env.RUNWAY_TIMEOUT_MS ?? "300000"),
    runwayModelName: "runway/gen4-turbo",
  };
}
