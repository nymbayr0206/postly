import { z } from "zod";

import { getOpenAiTranscriptionConfig } from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const languageSchema = z.enum(["mn", "en"]).default("mn");

type SupportedLanguage = z.infer<typeof languageSchema>;

type OpenAiTranscriptionResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

function getPromptForLanguage(language: SupportedLanguage) {
  if (language === "mn") {
    return "The audio may contain Mongolian words and names. Preserve punctuation and brand names clearly.";
  }

  return "The audio is likely in English. Preserve punctuation clearly.";
}

function normalizeOpenAiError(status: number, message: string, language: SupportedLanguage) {
  if (status === 401) {
    return "OpenAI API key буруу эсвэл хүчингүй байна.";
  }

  if (status === 413) {
    return "Аудио файл хэт том байна. Богинохон бичлэг оруулна уу.";
  }

  if (message.includes("Language") && message.includes("not supported")) {
    if (language === "mn") {
      return "Монгол хэлний кодыг шууд өгөхөд OpenAI татгалзаж байна. Auto-detect горимоор дахин оролдлоо.";
    }

    return "Сонгосон хэлний параметр дэмжигдэхгүй байна.";
  }

  if (status >= 500) {
    return "OpenAI transcription үйлчилгээ түр ажиллахгүй байна. Дахин оролдоно уу.";
  }

  return message || "Яриаг текст болгож чадсангүй.";
}

async function callOpenAiTranscription(options: {
  apiKey: string;
  endpoint: string;
  model: string;
  file: File;
  language: SupportedLanguage;
  includeLanguageParam: boolean;
}) {
  const openAiFormData = new FormData();
  openAiFormData.append("file", options.file, options.file.name || "speech.webm");
  openAiFormData.append("model", options.model);
  openAiFormData.append("response_format", "json");
  openAiFormData.append("prompt", getPromptForLanguage(options.language));

  if (options.includeLanguageParam && options.language === "en") {
    openAiFormData.append("language", "en");
  }

  const response = await fetch(options.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: openAiFormData,
  });

  const payload = (await response.json().catch(() => null)) as OpenAiTranscriptionResponse | null;

  return { response, payload };
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

  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
    return Response.json(
      { error: "Зөвхөн аудио бичлэг оруулна уу." },
      { status: 400 },
    );
  }

  const language = parsedLanguage.success ? parsedLanguage.data : "mn";

  try {
    const { apiKey, endpoint, model } = getOpenAiTranscriptionConfig();

    let { response, payload } = await callOpenAiTranscription({
      apiKey,
      endpoint,
      model,
      file,
      language,
      includeLanguageParam: language === "en",
    });

    const firstMessage = payload?.error?.message ?? "";
    const shouldRetryWithoutLanguage =
      !response.ok &&
      firstMessage.includes("Language") &&
      firstMessage.includes("not supported");

    if (shouldRetryWithoutLanguage) {
      ({ response, payload } = await callOpenAiTranscription({
        apiKey,
        endpoint,
        model,
        file,
        language,
        includeLanguageParam: false,
      }));
    }

    if (!response.ok) {
      return Response.json(
        {
          error: normalizeOpenAiError(
            response.status,
            payload?.error?.message ?? "Яриаг текст болгож чадсангүй.",
            language,
          ),
        },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const text = payload?.text?.trim();

    if (!text) {
      return Response.json(
        { error: "Ярианаас текст танигдсангүй." },
        { status: 422 },
      );
    }

    return Response.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Яриаг текст болгож чадсангүй.";

    return Response.json(
      { error: message },
      { status: 500 },
    );
  }
}
