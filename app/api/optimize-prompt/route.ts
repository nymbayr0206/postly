import { z } from "zod";

import { getOpenAiPromptOptimizerConfig } from "@/lib/openai";
import {
  PROMPT_OPTIMIZER_TARGETS,
  type OptimizedPromptResponse,
  type PromptOptimizerTarget,
  normalizePromptLanguage,
} from "@/lib/prompt-optimizer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

const requestSchema = z.object({
  prompt: z.string().trim().min(3, "Prompt хамгийн багадаа 3 тэмдэгт байх ёстой."),
  target: z.enum(PROMPT_OPTIMIZER_TARGETS).default("image"),
  aspectRatio: z.string().trim().max(20).optional(),
  duration: z.coerce.number().int().positive().optional(),
  quality: z.string().trim().max(20).optional(),
});

function getSystemPrompt(target: PromptOptimizerTarget) {
  const targetSpecificRules =
    target === "video"
      ? [
          "Optimize prompts for image-to-video generation.",
          "Output one clean English prompt for a video model.",
          "Preserve all concrete details from the user.",
          "Clarify camera movement, subject motion, scene motion, pacing, and atmosphere only when helpful.",
          "Do not invent new objects, people, brands, or events.",
          "Do not add shot lists, markdown, labels, or bullet points.",
        ]
      : [
          "Optimize prompts specifically for Nano Banana AI image generation.",
          "Output one clean English prompt for a text-to-image model.",
          "Preserve all concrete details from the user.",
          "Never replace a specific subject with generic words like product, item, object, or scene.",
          "If the user explicitly names an object, material, color, lighting direction, brand, or environment, keep it in the optimized prompt.",
          "Clarify subject, composition, framing, camera angle, lighting, environment, mood, materials, and color palette only when helpful.",
          "When the user asks for a product, social creative, ad visual, or poster-like image, frame it as strong commercial photography or polished campaign visual suitable for Nano Banana.",
          "Do not invent text inside the image unless the user explicitly asked for it.",
          "Do not invent new objects, people, brands, or claims.",
          "Do not add markdown, labels, bullet points, or explanations.",
        ];

  return [
    "You are a prompt optimizer for creative generation models.",
    "The user may write in Mongolian, English, or mixed language.",
    "If the input is Mongolian or mixed, translate it into clean natural English optimized for the target model.",
    "Preserve exact numbers, brand names, product names, required text, colors, and constraints.",
    "Never omit or generalize the user's explicit subject.",
    "If the prompt is already strong, only tighten wording and structure.",
    "Keep the optimized prompt concise but vivid, usually one to three sentences.",
    "Return JSON only with keys optimized_prompt, detected_language, notes_mn, and must_keep_terms_en.",
    "detected_language must be exactly one of: mn, en, mixed.",
    "notes_mn must be a short Mongolian sentence explaining what improved.",
    "must_keep_terms_en must be a short English array of the most important concrete terms that cannot be dropped from the final prompt.",
    ...targetSpecificRules,
  ].join(" ");
}

function buildUserContext(data: z.infer<typeof requestSchema>) {
  const lines = [
    `Target: ${data.target}`,
    data.target === "image" ? "Model: Nano Banana" : "Model: Runway image-to-video",
    `Original prompt: ${data.prompt}`,
  ];

  if (data.aspectRatio) {
    lines.push(`Aspect ratio: ${data.aspectRatio}`);
  }

  if (data.duration) {
    lines.push(`Duration: ${data.duration} seconds`);
  }

  if (data.quality) {
    lines.push(`Quality: ${data.quality}`);
  }

  return lines.join("\n");
}

function parseOptimizerContent(content: string) {
  const trimmed = content.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  try {
    return JSON.parse(withoutFence) as Record<string, unknown>;
  } catch {
    return {
      optimized_prompt: withoutFence,
      detected_language: null,
      notes_mn: null,
    };
  }
}

function normalizeTextValue(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}

function normalizeOptimizerPayload(content: string) {
  const raw = parseOptimizerContent(content);

  return {
    optimizedPrompt:
      normalizeTextValue(raw.optimized_prompt ?? raw.optimizedPrompt ?? raw.prompt, 2000) ?? null,
    detectedLanguage: normalizeTextValue(
      raw.detected_language ?? raw.detectedLanguage ?? raw.language,
      50,
    ),
    notesMn: normalizeTextValue(raw.notes_mn ?? raw.notesMn ?? raw.notes, 300),
    mustKeepTerms: normalizeStringArray(
      raw.must_keep_terms_en ?? raw.mustKeepTermsEn ?? raw.must_keep_terms,
      8,
      120,
    ),
  };
}

function enforceMustKeepTerms(prompt: string, terms: string[] | undefined) {
  const cleanedTerms = (terms ?? []).map((term) => term.trim()).filter(Boolean);

  if (cleanedTerms.length === 0) {
    return prompt;
  }

  const normalizedPrompt = prompt.toLowerCase();
  const missingTerms = cleanedTerms.filter((term) => !normalizedPrompt.includes(term.toLowerCase()));

  if (missingTerms.length === 0) {
    return prompt;
  }

  return `${missingTerms.join(", ")}. ${prompt}`;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Prompt сайжруулахын тулд нэвтэрнэ үү." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON хүсэлтийн мэдээлэл буруу байна." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Prompt хүсэлтийн мэдээлэл буруу байна." },
      { status: 400 },
    );
  }

  try {
    const config = getOpenAiPromptOptimizerConfig();
    const requestBody: Record<string, unknown> = {
      model: config.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: getSystemPrompt(parsed.data.target),
        },
        {
          role: "user",
          content: buildUserContext(parsed.data),
        },
      ],
    };

    if (!config.model.startsWith("gpt-5")) {
      requestBody.temperature = 0.2;
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const payload = (await response.json().catch(() => null)) as OpenAiChatCompletionsResponse | null;

    if (!response.ok) {
      return Response.json(
        { error: payload?.error?.message ?? "OpenAI prompt optimizer түр ажиллахгүй байна." },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const content = payload?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("OpenAI prompt optimizer хоосон хариу өглөө.");
    }

    const optimized = normalizeOptimizerPayload(content);

    if (!optimized.optimizedPrompt) {
      throw new Error("OpenAI prompt optimizer-ийн бүтэц буруу байна.");
    }

    const optimizedPrompt = enforceMustKeepTerms(optimized.optimizedPrompt, optimized.mustKeepTerms);

    const result: OptimizedPromptResponse = {
      optimizedPrompt,
      detectedLanguage: normalizePromptLanguage(optimized.detectedLanguage, parsed.data.prompt),
      notesMn: optimized.notesMn,
      changed: optimizedPrompt.trim() !== parsed.data.prompt.trim(),
    };

    if (!result.notesMn) {
      result.notesMn =
        result.detectedLanguage === "en"
          ? "Prompt-ийн бүтцийг цэгцэлж, илүү ойлгомжтой болголоо."
          : "Монгол prompt-ийг English болгож, Nano Banana-д илүү тохирсон бүтэцтэй болголоо.";
    }

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Prompt optimizer ажиллуулах үед алдаа гарлаа.",
      },
      { status: 500 },
    );
  }
}
