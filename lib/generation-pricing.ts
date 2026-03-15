import type { DialogueLine } from "@/lib/audio-models/types";
import type { VideoDuration, VideoQuality } from "@/lib/video-models/types";

export const IMAGE_RESOLUTIONS = ["1k", "2k", "4k"] as const;

export type ImageResolution = (typeof IMAGE_RESOLUTIONS)[number];

export const DEFAULT_IMAGE_BASE_COST = 8;
export const DEFAULT_AUDIO_CREDITS_PER_1000_CHARACTERS = 14;
export const DEFAULT_VIDEO_BASE_COST = 12;

export const HIGH_TIER_TOPUP_BONUS_RATE = 0.1;

function normalizeBaseCost(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value) || value === undefined || value === null) {
    return fallback;
  }

  return Math.max(1, Math.ceil(value));
}

export function formatCredits(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
}

export function formatMnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

export function creditsToMnt(credits: number, creditPriceMnt: number) {
  return credits * creditPriceMnt;
}

export function getImageResolutionLabel(resolution: ImageResolution) {
  if (resolution === "1k") {
    return "1K";
  }

  if (resolution === "2k") {
    return "2K";
  }

  return "4K";
}

export function getImageResolutionCost(
  resolution: ImageResolution,
  baseCost: number = DEFAULT_IMAGE_BASE_COST,
) {
  const normalizedBaseCost = normalizeBaseCost(baseCost, DEFAULT_IMAGE_BASE_COST);

  if (resolution === "2k") {
    return Math.max(normalizedBaseCost + 1, Math.ceil(normalizedBaseCost * 1.5));
  }

  if (resolution === "4k") {
    return Math.max(normalizedBaseCost + 2, Math.ceil(normalizedBaseCost * 2.25));
  }

  return normalizedBaseCost;
}

export function getImageResolutionDetail(
  resolution: ImageResolution,
  creditPriceMnt: number,
  baseCost: number = DEFAULT_IMAGE_BASE_COST,
) {
  const credits = getImageResolutionCost(resolution, baseCost);
  return `${formatCredits(credits)} кредит · ${formatMnt(creditsToMnt(credits, creditPriceMnt))}`;
}

export function countDialogueCharacters(dialogue: Array<Pick<DialogueLine, "text">>) {
  return dialogue.reduce((sum, line) => sum + line.text.trim().length, 0);
}

export function calculateAudioCreditsByCharacterCount(
  characterCount: number,
  costPer1000Characters: number = DEFAULT_AUDIO_CREDITS_PER_1000_CHARACTERS,
) {
  const normalizedCost = normalizeBaseCost(
    costPer1000Characters,
    DEFAULT_AUDIO_CREDITS_PER_1000_CHARACTERS,
  );

  if (characterCount <= 0) {
    return normalizedCost;
  }

  return Math.ceil(characterCount / 1000) * normalizedCost;
}

export function getVideoCredits(
  duration: VideoDuration,
  quality: VideoQuality,
  baseCost: number = DEFAULT_VIDEO_BASE_COST,
) {
  const normalizedBaseCost = normalizeBaseCost(baseCost, DEFAULT_VIDEO_BASE_COST);

  if (quality === "720p" && duration === 5) {
    return normalizedBaseCost;
  }

  return Math.max(normalizedBaseCost + 1, Math.ceil(normalizedBaseCost * 2.5));
}

export function getHighTierEffectiveCredits(rawCredits: number) {
  return rawCredits / (1 + HIGH_TIER_TOPUP_BONUS_RATE);
}

export function isFixedPricingModel(modelName: string) {
  return [
    "nano-banana-2",
    "nanobanana",
    "elevenlabs/text-to-dialogue-v3",
    "runway/gen4-turbo",
  ].includes(modelName);
}

export function getStartingCreditsForModel(modelName: string, baseCost?: number) {
  if (modelName === "elevenlabs/text-to-dialogue-v3") {
    return normalizeBaseCost(baseCost, DEFAULT_AUDIO_CREDITS_PER_1000_CHARACTERS);
  }

  if (modelName === "runway/gen4-turbo") {
    return normalizeBaseCost(baseCost, DEFAULT_VIDEO_BASE_COST);
  }

  if (modelName === "nano-banana-2" || modelName === "nanobanana") {
    return normalizeBaseCost(baseCost, DEFAULT_IMAGE_BASE_COST);
  }

  return 1;
}

export function getAdminPricingSummary(
  modelName: string,
  creditPriceMnt: number,
  baseCost?: number,
) {
  if (modelName === "elevenlabs/text-to-dialogue-v3") {
    const audioBaseCost = normalizeBaseCost(baseCost, DEFAULT_AUDIO_CREDITS_PER_1000_CHARACTERS);
    const doubleBlockCredits = audioBaseCost * 2;

    return {
      title: `${formatCredits(audioBaseCost)} кредит / 1,000 тэмдэгт`,
      description:
        "ElevenLabs Text-to-Speech V3 нь 1,000 тэмдэгт тутамд энэ base credit-ийг авна. Урт text дээр 1,000 тэмдэгт бүрийн block-оор үржинэ.",
      bullets: [
        `1,000 тэмдэгт: ${formatCredits(audioBaseCost)} кредит · ${formatMnt(creditsToMnt(audioBaseCost, creditPriceMnt))}`,
        `2,000 тэмдэгт: ${formatCredits(doubleBlockCredits)} кредит · ${formatMnt(creditsToMnt(doubleBlockCredits, creditPriceMnt))}`,
      ],
    };
  }

  if (modelName === "runway/gen4-turbo") {
    const baseVideoCredits = normalizeBaseCost(baseCost, DEFAULT_VIDEO_BASE_COST);
    const premiumVideoCredits = getVideoCredits(10, "720p", baseVideoCredits);

    return {
      title: `${formatCredits(baseVideoCredits)} эсвэл ${formatCredits(premiumVideoCredits)} кредит / видео`,
      description:
        "Runway 5 секунд 720p нь base credit-ийг авна. 10 секунд 720p болон 5 секунд 1080p нь higher tier credit-ээр бодогдоно.",
      bullets: [
        `5 секунд · 720p: ${formatCredits(baseVideoCredits)} кредит · ${formatMnt(creditsToMnt(baseVideoCredits, creditPriceMnt))}`,
        `10 секунд · 720p: ${formatCredits(premiumVideoCredits)} кредит · ${formatMnt(creditsToMnt(premiumVideoCredits, creditPriceMnt))}`,
        `5 секунд · 1080p: ${formatCredits(premiumVideoCredits)} кредит · ${formatMnt(creditsToMnt(premiumVideoCredits, creditPriceMnt))}`,
      ],
    };
  }

  if (modelName === "nano-banana-2" || modelName === "nanobanana") {
    const imageBaseCost = normalizeBaseCost(baseCost, DEFAULT_IMAGE_BASE_COST);
    const image2kCost = getImageResolutionCost("2k", imageBaseCost);
    const image4kCost = getImageResolutionCost("4k", imageBaseCost);

    return {
      title: `${formatCredits(imageBaseCost)} / ${formatCredits(image2kCost)} / ${formatCredits(image4kCost)} кредит`,
      description:
        "Nano Banana 2 нь 1K base credit-ээр бодогдоно. 2K болон 4K утгууд нь энэ base-ээс автоматаар үүснэ.",
      bullets: [
        `1K: ${formatCredits(imageBaseCost)} кредит · ${formatMnt(creditsToMnt(imageBaseCost, creditPriceMnt))}`,
        `2K: ${formatCredits(image2kCost)} кредит · ${formatMnt(creditsToMnt(image2kCost, creditPriceMnt))}`,
        `4K: ${formatCredits(image4kCost)} кредит · ${formatMnt(creditsToMnt(image4kCost, creditPriceMnt))}`,
      ],
    };
  }

  return {
    title: "Тусгай pricing",
    description: "Энэ model-д одоогоор тусгай pricing тайлбар тохируулаагүй байна.",
    bullets: [],
  };
}
