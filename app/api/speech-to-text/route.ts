import { z } from "zod";

import { getOpenAiTextCleanupConfig } from "@/lib/openai";
import { getMicrosoftSpeechConfig } from "@/lib/microsoft-speech";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_DURATION_MS = 120_000;

const languageSchema = z.enum(["mn", "en"]).default("mn");
const cleanModeSchema = z
  .union([z.literal("true"), z.literal("false")])
  .transform((value) => value === "true")
  .default(false);
const durationMsSchema = z.coerce.number().int().min(0).max(MAX_DURATION_MS);
const cleanupResultSchema = z.object({
  cleaned_transcript: z.string().min(1),
  changed: z.boolean().optional(),
});

type SupportedLanguage = z.infer<typeof languageSchema>;
type TranscriptQualityRating = "high" | "medium" | "low";

type MicrosoftSpeechResponse = {
  RecognitionStatus?: string;
  DisplayText?: string;
  Offset?: number;
  Duration?: number;
  NBest?: Array<{
    Display?: string;
    Confidence?: number;
    Lexical?: string;
    ITN?: string;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getMicrosoftLocale(language: SupportedLanguage) {
  return language === "mn" ? "mn-MN" : "en-US";
}

function getCleanupSystemPrompt(language: SupportedLanguage, cleanMode: boolean) {
  const fillerRule = cleanMode
    ? "Remove filler words and hesitation words only when it is clearly safe to do so."
    : "Do not remove filler words or hesitation words.";

  if (language === "mn") {
    return [
      "You clean up Mongolian speech-to-text transcripts.",
      "Fix obvious recognition mistakes only when you are highly confident.",
      "Normalize Mongolian Cyrillic spelling.",
      "Add punctuation and sentence casing.",
      "Preserve names, brands, numbers, and the original meaning.",
      fillerRule,
      "Never translate to another language.",
      "Return JSON with keys cleaned_transcript and changed.",
    ].join(" ");
  }

  return [
    "You clean up English speech-to-text transcripts.",
    "Fix obvious recognition mistakes only when you are highly confident.",
    "Add punctuation and sentence casing.",
    "Preserve names, brands, numbers, and the original meaning.",
    fillerRule,
    "Never translate to another language.",
    "Return JSON with keys cleaned_transcript and changed.",
  ].join(" ");
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getScriptMatchRatio(text: string, language: SupportedLanguage) {
  const letters = Array.from(text).filter((character) => /\p{L}/u.test(character));

  if (letters.length === 0) {
    return 0;
  }

  const matcher = language === "mn" ? /[\u0400-\u04FF]/u : /[A-Za-z]/u;
  const matched = letters.filter((character) => matcher.test(character)).length;

  return Number((matched / letters.length).toFixed(3));
}

function estimateTranscriptQuality(options: {
  language: SupportedLanguage;
  rawTranscript: string;
  cleanedTranscript: string;
  providerConfidence: number | null;
  providerStatus: string;
}) {
  const rawScriptMatchRatio = getScriptMatchRatio(options.rawTranscript, options.language);
  const cleanedScriptMatchRatio = getScriptMatchRatio(options.cleanedTranscript, options.language);
  const changedByCleanup = options.rawTranscript.trim() !== options.cleanedTranscript.trim();
  const cleanedWordCount = countWords(options.cleanedTranscript);

  let rating: TranscriptQualityRating = "low";

  if (
    cleanedWordCount >= 4 &&
    cleanedScriptMatchRatio >= 0.75 &&
    (options.providerConfidence === null || options.providerConfidence >= 0.7)
  ) {
    rating = "high";
  } else if (
    cleanedWordCount >= 2 &&
    cleanedScriptMatchRatio >= 0.45 &&
    (options.providerConfidence === null || options.providerConfidence >= 0.45)
  ) {
    rating = "medium";
  }

  return {
    rating,
    providerStatus: options.providerStatus,
    providerConfidence: options.providerConfidence,
    rawScriptMatchRatio,
    cleanedScriptMatchRatio,
    rawWordCount: countWords(options.rawTranscript),
    cleanedWordCount,
    changedByCleanup,
  };
}

function normalizeProviderError(status: number, message: string) {
  if (status === 401 || status === 403) {
    return "Microsoft Speech key буруу эсвэл хүчинтэй биш байна.";
  }

  if (status === 415) {
    return "Аудио формат дэмжигдэхгүй байна. Дахин бичиж оролдоно уу.";
  }

  if (status === 429) {
    return "Speech үйлчилгээний хүсэлтийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоно уу.";
  }

  if (status >= 500) {
    return "Microsoft Speech үйлчилгээ түр ажиллахгүй байна. Дахин оролдоно уу.";
  }

  return message || "Яриаг текст болгож чадсангүй.";
}

function normalizeRecognitionStatus(status: string | undefined) {
  switch (status) {
    case "Success":
      return null;
    case "NoMatch":
      return "Яриа тодорхой танигдсангүй. Илүү ойроос, 10-20 секундийн богино бичлэгээр дахин оролдоно уу.";
    case "InitialSilenceTimeout":
      return "Бичлэгийн эхэнд яриа сонсогдсонгүй.";
    case "BabbleTimeout":
      return "Яриа хэт бүдэг эсвэл дуу чимээ ихтэй байна.";
    case "Error":
      return "Speech recognition боловсруулах үед алдаа гарлаа.";
    default:
      return "Яриаг текст болгож чадсангүй.";
  }
}

async function callMicrosoftSpeechTranscription(options: {
  keys: string[];
  recognitionEndpoint: string;
  file: File;
  locale: string;
}) {
  const url = new URL(options.recognitionEndpoint);
  url.searchParams.set("language", options.locale);
  url.searchParams.set("format", "detailed");
  url.searchParams.set("profanity", "raw");

  let lastResponse: Response | null = null;
  let lastPayload: MicrosoftSpeechResponse | null = null;

  for (const key of options.keys) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        Accept: "application/json;text/xml",
        "Content-Type": options.file.type || "audio/wav; codecs=audio/pcm; samplerate=16000",
      },
      body: options.file,
    });

    const payload = (await response.json().catch(() => null)) as MicrosoftSpeechResponse | null;

    lastResponse = response;
    lastPayload = payload;

    if (response.status !== 401 && response.status !== 403) {
      break;
    }
  }

  if (!lastResponse) {
    throw new Error("Microsoft Speech хүсэлтийг илгээж чадсангүй.");
  }

  return {
    response: lastResponse,
    payload: lastPayload,
  };
}

async function cleanupTranscript(options: {
  rawTranscript: string;
  language: SupportedLanguage;
  cleanMode: boolean;
}) {
  const cleanupConfig = getOpenAiTextCleanupConfig();

  const response = await fetch(cleanupConfig.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleanupConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cleanupConfig.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: getCleanupSystemPrompt(options.language, options.cleanMode),
        },
        {
          role: "user",
          content: JSON.stringify({
            language: options.language,
            clean_mode: options.cleanMode,
            raw_transcript: options.rawTranscript,
          }),
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => null)) as OpenAiChatCompletionsResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Transcript цэвэрлэж чадсангүй.");
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Transcript цэвэрлэх хариу хоосон ирлээ.");
  }

  const parsed = cleanupResultSchema.safeParse(JSON.parse(content));

  if (!parsed.success) {
    throw new Error("Transcript цэвэрлэх хариу буруу бүтэцтэй байна.");
  }

  return {
    model: cleanupConfig.model,
    result: parsed.data,
  };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json(
      { error: "Яриаг текст болгохын тулд нэвтэрнэ үү." },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Аудио хүсэлтийн мэдээлэл буруу байна." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const parsedLanguage = languageSchema.safeParse(formData.get("language"));
  const parsedCleanMode = cleanModeSchema.safeParse(formData.get("clean_mode") ?? "false");
  const parsedDurationMs = durationMsSchema.safeParse(formData.get("duration_ms") ?? 0);

  if (!(file instanceof File)) {
    return Response.json(
      { error: "Аудио файл шаардлагатай." },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return Response.json(
      { error: "Хоосон аудио файл байна." },
      { status: 400 },
    );
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return Response.json(
      { error: "Аудио файл 25MB-аас ихгүй байх ёстой." },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("audio/")) {
    return Response.json(
      { error: "Зөвхөн аудио бичлэг оруулна уу." },
      { status: 400 },
    );
  }

  const language = parsedLanguage.success ? parsedLanguage.data : "mn";
  const cleanMode = parsedCleanMode.success ? parsedCleanMode.data : false;
  const durationMs = parsedDurationMs.success ? parsedDurationMs.data : 0;
  const durationSeconds = Number((durationMs / 1000).toFixed(2));
  const locale = getMicrosoftLocale(language);

  try {
    const microsoftConfig = getMicrosoftSpeechConfig();

    console.info("[speech-to-text] request", {
      userId: user.id,
      language,
      locale,
      cleanMode,
      durationSeconds,
      audioBytes: file.size,
      mimeType: file.type,
      transcriptionModel: "microsoft-speech-conversation-v1",
      cleanupModel: process.env.OPENAI_TEXT_CLEANUP_MODEL?.trim() || "gpt-4o-mini",
    });

    const { response, payload } = await callMicrosoftSpeechTranscription({
      keys: microsoftConfig.keys,
      recognitionEndpoint: microsoftConfig.recognitionEndpoint,
      file,
      locale,
    });

    if (!response.ok) {
      return Response.json(
        {
          error: normalizeProviderError(
            response.status,
            payload?.error?.message ?? "Яриаг текст болгож чадсангүй.",
          ),
        },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const providerStatus = payload?.RecognitionStatus ?? "Unknown";
    const statusError = normalizeRecognitionStatus(providerStatus);

    if (statusError) {
      return Response.json(
        { error: statusError },
        { status: 422 },
      );
    }

    const providerConfidence = payload?.NBest?.[0]?.Confidence ?? null;
    const rawTranscript = payload?.DisplayText?.trim() || payload?.NBest?.[0]?.Display?.trim();

    if (!rawTranscript) {
      return Response.json(
        { error: "Ярианаас текст танигдсангүй." },
        { status: 422 },
      );
    }

    let cleanedTranscript = rawTranscript;
    let changedByCleanup = false;
    let cleanupModel = "disabled";

    try {
      const cleanup = await cleanupTranscript({
        rawTranscript,
        language,
        cleanMode,
      });

      cleanupModel = cleanup.model;
      cleanedTranscript = cleanup.result.cleaned_transcript.trim() || rawTranscript;
      changedByCleanup = cleanup.result.changed ?? cleanedTranscript !== rawTranscript;
    } catch (cleanupError) {
      console.warn("[speech-to-text] cleanup-failed", {
        userId: user.id,
        language,
        cleanMode,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    }

    const quality = estimateTranscriptQuality({
      language,
      rawTranscript,
      cleanedTranscript,
      providerConfidence,
      providerStatus,
    });

    console.info("[speech-to-text] result", {
      userId: user.id,
      language,
      locale,
      cleanMode,
      durationSeconds,
      transcriptionModel: "microsoft-speech-conversation-v1",
      cleanupModel,
      quality,
      rawLength: rawTranscript.length,
      cleanedLength: cleanedTranscript.length,
      changedByCleanup,
    });

    if (quality.rating === "low") {
      console.warn("[speech-to-text] low-quality-transcript", {
        userId: user.id,
        language,
        locale,
        durationSeconds,
        quality,
      });
    }

    return Response.json({
      rawTranscript,
      cleanedTranscript,
      appliedTranscript: cleanedTranscript,
      cleanMode,
      durationSeconds,
      quality,
      models: {
        transcription: "microsoft-speech-conversation-v1",
        cleanup: cleanupModel,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Яриаг текст болгож чадсангүй.";

    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}
