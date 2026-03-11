export const PROMPT_OPTIMIZER_TARGETS = ["image", "video"] as const;
export const PROMPT_OPTIMIZER_LANGUAGES = ["mn", "mixed", "en"] as const;

export type PromptOptimizerTarget = (typeof PROMPT_OPTIMIZER_TARGETS)[number];
export type PromptOptimizerLanguage = (typeof PROMPT_OPTIMIZER_LANGUAGES)[number];

export type OptimizedPromptResponse = {
  optimizedPrompt: string;
  detectedLanguage: PromptOptimizerLanguage;
  notesMn: string | null;
  changed: boolean;
};

export function containsCyrillicText(value: string) {
  return /[\u0400-\u04FF]/u.test(value);
}

export function inferPromptLanguage(value: string): PromptOptimizerLanguage {
  const hasCyrillic = /[\u0400-\u04FF]/u.test(value);
  const hasLatin = /[A-Za-z]/u.test(value);

  if (hasCyrillic && hasLatin) {
    return "mixed";
  }

  if (hasCyrillic) {
    return "mn";
  }

  return "en";
}

export function normalizePromptLanguage(value: string | null | undefined, fallbackSource: string) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return inferPromptLanguage(fallbackSource);
  }

  if (normalized === "mn" || normalized.includes("mongol")) {
    return "mn";
  }

  if (normalized === "en" || normalized.includes("english")) {
    return "en";
  }

  if (normalized === "mixed" || normalized.includes("mix")) {
    return "mixed";
  }

  return inferPromptLanguage(fallbackSource);
}
