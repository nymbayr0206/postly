function readChimegeEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Шаардлагатай Chimege орчны хувьсагч алга: ${name}`);
  }

  return value;
}

export function getChimegeTranscriptionConfig() {
  return {
    token: readChimegeEnv("CHIMEGE_API_TOKEN"),
    endpoint: process.env.CHIMEGE_TRANSCRIBE_ENDPOINT?.trim() || "https://api.chimege.com/v1.2/transcribe",
  };
}
