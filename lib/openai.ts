function readOpenAiEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Шаардлагатай OpenAI орчны хувьсагч алга: ${name}`);
  }

  return value;
}

export function getOpenAiTranscriptionConfig() {
  return {
    apiKey: readOpenAiEnv("OPENAI_API_KEY"),
    model: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1",
    endpoint: "https://api.openai.com/v1/audio/transcriptions",
  };
}
