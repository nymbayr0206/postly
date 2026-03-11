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
