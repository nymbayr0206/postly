import { z } from "zod";

import { getChimegeTranscriptionConfig } from "@/lib/chimege";
import { getOpenAiTextCleanupConfig, getOpenAiTranscriptionConfig } from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const CHIMEGE_MAX_AUDIO_BYTES = 3 * 1024 * 1024;
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

type OpenAiTranscriptionResponse = {
  text?: string;
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

function getOpenAiTranscriptionPrompt(language: SupportedLanguage) {
  if (language === "mn") {
    return "The speaker is speaking Mongolian. Return the transcript in Mongolian Cyrillic. Preserve names, brands, and punctuation.";
  }

  return "The speaker is speaking English. Return the transcript in English. Preserve names, brands, and punctuation.";
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

function normalizeOpenAiError(status: number, message: string) {
  if (status === 401) {
    return "OpenAI API key буруу эсвэл хүчингүй байна.";
  }

  if (status === 413) {
    return "Аудио файл хэт том байна. Богинохон бичлэг оруулна уу.";
  }

  if (status >= 500) {
    return "OpenAI transcription үйлчилгээ түр ажиллахгүй байна. Дахин оролдоно уу.";
  }

  return message || "Яриаг текст болгож чадсангүй.";
}

function normalizeChimegeError(status: number, errorCode: string | null, message: string) {
  if (status === 403) {
    return "Chimege token буруу эсвэл хүчинтэй биш байна.";
  }

  switch (errorCode) {
    case "2000":
      return "Аудио дамжуулах үед алдаа гарлаа. Дахин оролдоно уу.";
    case "2001":
      return "Аудио файл хэт том байна. Chimege short STT нь 3MB хүртэл WAV дэмжинэ.";
    case "2002":
      return "Аудио файл хэт жижиг байна. Илүү урт, тод бичлэг оруулна уу.";
    case "2003":
      return "Аудио хэт богино байна. Хамгийн багадаа 0.5 секунд бичнэ үү.";
    case "2004":
      return "Аудио формат буруу байна. Chimege STT нь WAV формат шаарддаг.";
    case "2005":
      return "Аудиог WAV руу боловсруулахад алдаа гарлаа.";
    default:
      return message || "Chimege speech-to-text боловсруулах үед алдаа гарлаа.";
  }
}

async function callOpenAiTranscription(options: {
  apiKey: string;
  endpoint: string;
  model: string;
  file: File;
  language: SupportedLanguage;
}) {
  const formData = new FormData();
  formData.append("file", options.file, options.file.name || "speech.wav");
  formData.append("model", options.model);
  formData.append("prompt", getOpenAiTranscriptionPrompt(options.language));
  if (options.language === "en") {
    formData.append("language", "en");
  }

  const response = await fetch(options.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as OpenAiTranscriptionResponse | null;
  return { response, payload };
}

async function callChimegeTranscription(file: File) {
  const config = getChimegeTranscriptionConfig();

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      token: config.token,
      punctuate: "false",
      "Content-Type": "application/octet-stream",
      Accept: "text/plain",
    },
    body: file,
  });

  const text = await response.text().catch(() => "");
  return {
    response,
    text,
    errorCode: response.headers.get("Error-Code"),
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
      { error: "Аудио файл хэт том байна." },
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

  if (language === "mn" && file.size > CHIMEGE_MAX_AUDIO_BYTES) {
    return Response.json(
      { error: "Chimege short STT нь 3MB хүртэл WAV файл дэмжинэ." },
      { status: 400 },
    );
  }

  try {
    const cleanupModelName = process.env.OPENAI_TEXT_CLEANUP_MODEL?.trim() || "gpt-4o-mini";

    if (language === "mn") {
      console.info("[speech-to-text] request", {
        userId: user.id,
        language,
        provider: "chimege",
        cleanMode,
        durationSeconds,
        audioBytes: file.size,
        mimeType: file.type,
        transcriptionModel: "chimege-transcribe",
        cleanupModel: cleanupModelName,
      });

      const { response, text, errorCode } = await callChimegeTranscription(file);

      if (!response.ok) {
        return Response.json(
          { error: normalizeChimegeError(response.status, errorCode, text.trim()) },
          { status: response.status >= 500 ? 502 : response.status },
        );
      }

      const rawTranscript = text.trim();

      if (!rawTranscript) {
        console.warn("[speech-to-text] chimege-empty", {
          userId: user.id,
          durationSeconds,
          audioBytes: file.size,
        });

        return Response.json(
          { error: "Ярианаас текст танигдсангүй. Илүү тод, ойроос яриад дахин оролдоно уу." },
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
        providerConfidence: null,
        providerStatus: "Success",
      });

      console.info("[speech-to-text] result", {
        userId: user.id,
        language,
        provider: "chimege",
        cleanMode,
        durationSeconds,
        transcriptionModel: "chimege-transcribe",
        cleanupModel,
        quality,
        rawLength: rawTranscript.length,
        cleanedLength: cleanedTranscript.length,
        changedByCleanup,
      });

      return Response.json({
        rawTranscript,
        cleanedTranscript,
        appliedTranscript: cleanedTranscript,
        cleanMode,
        durationSeconds,
        quality,
        models: {
          transcription: "chimege-transcribe",
          cleanup: cleanupModel,
        },
      });
    }

    const openAiConfig = getOpenAiTranscriptionConfig();

    console.info("[speech-to-text] request", {
      userId: user.id,
      language,
      provider: "openai",
      cleanMode,
      durationSeconds,
      audioBytes: file.size,
      mimeType: file.type,
      transcriptionModel: openAiConfig.model,
      cleanupModel: cleanupModelName,
    });

    const { response, payload } = await callOpenAiTranscription({
      apiKey: openAiConfig.apiKey,
      endpoint: openAiConfig.endpoint,
      model: openAiConfig.model,
      file,
      language,
    });

    if (!response.ok) {
      return Response.json(
        {
          error: normalizeOpenAiError(
            response.status,
            payload?.error?.message ?? "Яриаг текст болгож чадсангүй.",
          ),
        },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const rawTranscript = payload?.text?.trim();

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
      providerConfidence: null,
      providerStatus: "Success",
    });

    console.info("[speech-to-text] result", {
      userId: user.id,
      language,
      provider: "openai",
      cleanMode,
      durationSeconds,
      transcriptionModel: openAiConfig.model,
      cleanupModel,
      quality,
      rawLength: rawTranscript.length,
      cleanedLength: cleanedTranscript.length,
      changedByCleanup,
    });

    return Response.json({
      rawTranscript,
      cleanedTranscript,
      appliedTranscript: cleanedTranscript,
      cleanMode,
      durationSeconds,
      quality,
      models: {
        transcription: openAiConfig.model,
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
