import { z } from "zod";

import { getOpenAiTranscriptionConfig } from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const languageSchema = z.enum(["mn", "en"]).default("mn");

function getPromptForLanguage(language: "mn" | "en") {
  if (language === "mn") {
    return "The audio is likely in Mongolian. Preserve brand names and punctuation clearly.";
  }

  return "The audio is likely in English. Preserve punctuation clearly.";
}

function getErrorMessage(status: number, fallback: string) {
  if (status === 401) {
    return "OpenAI API key буруу эсвэл хүчингүй байна.";
  }

  if (status === 413) {
    return "Аудио файл хэт том байна. Богинохон бичлэг оруулна уу.";
  }

  if (status >= 500) {
    return "OpenAI transcription үйлчилгээ түр ажиллахгүй байна. Дахин оролдоно уу.";
  }

  return fallback;
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
    const openAiFormData = new FormData();

    openAiFormData.append("file", file, file.name || "speech.webm");
    openAiFormData.append("model", model);
    openAiFormData.append("language", language);
    openAiFormData.append("response_format", "json");
    openAiFormData.append("prompt", getPromptForLanguage(language));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAiFormData,
    });

    const payload = (await response.json().catch(() => null)) as
      | { text?: string; error?: { message?: string } }
      | null;

    if (!response.ok) {
      return Response.json(
        {
          error: getErrorMessage(
            response.status,
            payload?.error?.message ?? "Яриаг текст болгож чадсангүй.",
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
