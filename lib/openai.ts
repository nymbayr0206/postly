function readOpenAiEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Шаардлагатай OpenAI орчны хувьсагч алга: ${name}`);
  }

  return value;
}

function resolveTranscriptionModel() {
  const configuredModel = process.env.OPENAI_TRANSCRIPTION_MODEL?.trim();

  // `whisper-1` нь Монгол хэл дээр чанар муутай байсан тул илүү шинэ model руу автоматаар шилжүүлнэ.
  if (!configuredModel || configuredModel === "whisper-1") {
    return "gpt-4o-transcribe";
  }

  return configuredModel;
}

export function getOpenAiTranscriptionConfig() {
  return {
    apiKey: readOpenAiEnv("OPENAI_API_KEY"),
    model: resolveTranscriptionModel(),
    endpoint: "https://api.openai.com/v1/audio/transcriptions",
  };
}
