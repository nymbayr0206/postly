import { z } from "zod";

import { getOpenAiPromptOptimizerConfig } from "@/lib/openai";
import {
  PROMPT_OPTIMIZER_LANGUAGES,
  PROMPT_OPTIMIZER_TARGETS,
  type OptimizedPromptResponse,
  type PromptOptimizerTarget,
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
  prompt: z.string().trim().min(3, "Prompt хамгийн багадаа 3 тэмдэгт байх ёстой.").max(2000),
  target: z.enum(PROMPT_OPTIMIZER_TARGETS).default("image"),
  aspectRatio: z.string().trim().max(20).optional(),
  duration: z.coerce.number().int().positive().optional(),
  quality: z.string().trim().max(20).optional(),
});

const optimizedPromptSchema = z.object({
  optimized_prompt: z.string().trim().min(3).max(2000),
  detected_language: z.enum(PROMPT_OPTIMIZER_LANGUAGES).default("mixed"),
  notes_mn: z.string().trim().min(1).max(300).nullable().optional(),
});

function getSystemPrompt(target: PromptOptimizerTarget) {
  const targetSpecificRules =
    target === "video"
      ? [
          "Optimize prompts for image-to-video generation.",
          "Keep the prompt in fluent English.",
          "Preserve all concrete details from the user.",
          "Clarify camera movement, subject motion, scene motion, pacing, and atmosphere only when helpful.",
          "Do not invent new objects, people, brands, or events.",
          "Do not add shot lists or bullet points.",
        ]
      : [
          "Optimize prompts for AI image generation.",
          "Keep the prompt in fluent English.",
          "Preserve all concrete details from the user.",
          "Clarify composition, framing, lighting, mood, and materials only when helpful.",
          "Do not invent new objects, people, brands, or claims.",
          "Do not add bullet points or explanations.",
        ];

  return [
    "You are a prompt optimizer for creative generation models.",
    "The user may write in Mongolian, English, or mixed language.",
    "If the input is Mongolian or mixed, convert it into clean natural English optimized for the target model.",
    "Preserve exact numbers, brand names, product names, required text, colors, and constraints.",
    "If the prompt is already strong, only tighten wording and structure.",
    "Return JSON only with keys optimized_prompt, detected_language, and notes_mn.",
    "notes_mn must be a short Mongolian sentence explaining what improved.",
    ...targetSpecificRules,
  ].join(" ");
}

function buildUserContext(data: z.infer<typeof requestSchema>) {
  return JSON.stringify({
    target: data.target,
    prompt: data.prompt,
    context: {
      aspect_ratio: data.aspectRatio ?? null,
      duration_seconds: data.duration ?? null,
      quality: data.quality ?? null,
    },
  });
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
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
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
      }),
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

    const optimized = optimizedPromptSchema.safeParse(JSON.parse(content));

    if (!optimized.success) {
      throw new Error("OpenAI prompt optimizer-ийн бүтэц буруу байна.");
    }

    const result: OptimizedPromptResponse = {
      optimizedPrompt: optimized.data.optimized_prompt,
      detectedLanguage: optimized.data.detected_language,
      notesMn: optimized.data.notes_mn ?? null,
      changed: optimized.data.optimized_prompt.trim() !== parsed.data.prompt.trim(),
    };

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Prompt optimizer ажиллуулах үед алдаа гарлаа.",
      },
      { status: 500 },
    );
  }
}
