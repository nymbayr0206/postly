function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Шаардлагатай Microsoft Speech орчны хувьсагч алга: ${name}`);
  }

  return value;
}

function resolveRegion(endpoint: string) {
  const url = new URL(endpoint);
  const regionFromHost = url.hostname.match(/^([^.]+)\.api\.cognitive\.microsoft\.com$/i)?.[1];

  if (regionFromHost) {
    return regionFromHost;
  }

  const explicitRegion = readEnv("MICROSOFT_SPEECH_REGION");

  if (explicitRegion) {
    return explicitRegion;
  }

  throw new Error("Microsoft Speech region-ийг endpoint-оос тодорхойлж чадсангүй.");
}

export function getMicrosoftSpeechConfig() {
  const endpoint = requireEnv("MICROSOFT_SPEECH_ENDPOINT");
  const keys = [readEnv("MICROSOFT_SPEECH_KEY_1"), readEnv("MICROSOFT_SPEECH_KEY_2")].filter(
    (value): value is string => Boolean(value),
  );

  if (keys.length === 0) {
    throw new Error("Microsoft Speech key тохируулагдаагүй байна.");
  }

  const region = resolveRegion(endpoint);

  return {
    endpoint,
    region,
    keys,
    recognitionEndpoint:
      readEnv("MICROSOFT_SPEECH_RECOGNITION_ENDPOINT") ??
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`,
  };
}
