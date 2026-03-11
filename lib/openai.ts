function readOpenAiEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Шаардлагатай OpenAI орчны хувьсагч алга: ${name}`);
  }

  return value;
}

function resolveTranscriptionModel() {
  const configuredModel = process.env.OPENAI_TRANSCRIPTION_MODEL?.trim();

  // whisper-1 нь Монгол яриан дээр тогтвортой биш байсан тул илүү шинэ transcription model руу шилжүүлнэ.
  if (!configuredModel || configuredModel === "whisper-1") {
    return "gpt-4o-transcribe";
  }

  return configuredModel;
}

function resolveCleanupModel() {
  return process.env.OPENAI_TEXT_CLEANUP_MODEL?.trim() || "gpt-4o-mini";
}

function resolvePromptOptimizerModel() {
  return process.env.OPENAI_PROMPT_OPTIMIZER_MODEL?.trim() || "gpt-4o-mini";
}

export function getOpenAiTranscriptionConfig() {
  return {
    apiKey: readOpenAiEnv("OPENAI_API_KEY"),
    model: resolveTranscriptionModel(),
    endpoint: "https://api.openai.com/v1/audio/transcriptions",
  };
}

export function getOpenAiTextCleanupConfig() {
  return {
    apiKey: readOpenAiEnv("OPENAI_API_KEY"),
    model: resolveCleanupModel(),
    endpoint: "https://api.openai.com/v1/chat/completions",
  };
}

export function getOpenAiPromptOptimizerConfig() {
  return {
    apiKey: readOpenAiEnv("OPENAI_API_KEY"),
    model: resolvePromptOptimizerModel(),
    endpoint: "https://api.openai.com/v1/chat/completions",
  };
}
