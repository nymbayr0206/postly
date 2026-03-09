import type { DialogueLine } from "@/lib/audio-models/types";
import type { VideoDuration, VideoQuality } from "@/lib/video-models/types";

export const IMAGE_RESOLUTIONS = ["1k", "2k", "4k"] as const;

export type ImageResolution = (typeof IMAGE_RESOLUTIONS)[number];

export const AUDIO_CREDITS_PER_1000_CHARACTERS = 14;

export const HIGH_TIER_TOPUP_BONUS_RATE = 0.1;

export function formatCredits(value: number) {
  return new Intl.NumberFormat("mn-MN").format(value);
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

export function getImageResolutionCost(resolution: ImageResolution) {
  if (resolution === "2k") {
    return 12;
  }

  if (resolution === "4k") {
    return 18;
  }

  return 8;
}

export function getImageResolutionDetail(resolution: ImageResolution) {
  if (resolution === "2k") {
    return "12 кредит · ойролцоогоор $0.06";
  }

  if (resolution === "4k") {
    return "18 кредит · ойролцоогоор $0.09";
  }

  return "8 кредит · ойролцоогоор $0.04";
}

export function countDialogueCharacters(dialogue: Array<Pick<DialogueLine, "text">>) {
  return dialogue.reduce((sum, line) => sum + line.text.trim().length, 0);
}

export function calculateAudioCreditsByCharacterCount(characterCount: number) {
  if (characterCount <= 0) {
    return AUDIO_CREDITS_PER_1000_CHARACTERS;
  }

  return Math.ceil(characterCount / 1000) * AUDIO_CREDITS_PER_1000_CHARACTERS;
}

export function getVideoCredits(duration: VideoDuration, quality: VideoQuality) {
  if (quality === "720p" && duration === 5) {
    return 12;
  }

  return 30;
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

export function getStartingCreditsForModel(modelName: string) {
  if (modelName === "elevenlabs/text-to-dialogue-v3") {
    return AUDIO_CREDITS_PER_1000_CHARACTERS;
  }

  if (modelName === "runway/gen4-turbo") {
    return 12;
  }

  if (modelName === "nano-banana-2" || modelName === "nanobanana") {
    return 8;
  }

  return 1;
}

export function getAdminPricingSummary(modelName: string) {
  if (modelName === "elevenlabs/text-to-dialogue-v3") {
    return {
      title: "14 кредит / 1,000 тэмдэгт",
      description:
        "ElevenLabs Text-to-Speech V3 нь 1,000 тэмдэгт тутамд 14 кредит. Дээд багцын +10% бонусоор effective үнэ ойролцоогоор $0.063 / 1,000 тэмдэгт болно.",
      bullets: [
        "1,000 тэмдэгт: 14 кредит ≈ $0.07",
        "High-tier top-up effective үнэ: ≈ $0.063 / 1,000 тэмдэгт",
      ],
    };
  }

  if (modelName === "runway/gen4-turbo") {
    return {
      title: "12 эсвэл 30 кредит / видео",
      description:
        "Runway 5 секунд 720p нь 12 кредит. 10 секунд 720p эсвэл 5 секунд 1080p нь 30 кредит байна.",
      bullets: [
        "5 секунд · 720p: 12 кредит ≈ $0.06",
        "10 секунд · 720p: 30 кредит ≈ $0.15",
        "5 секунд · 1080p: 30 кредит ≈ $0.15",
        "High-tier top-up effective үнэ: ≈ $0.055 болон ≈ $0.136",
      ],
    };
  }

  if (modelName === "nano-banana-2" || modelName === "nanobanana") {
    return {
      title: "8 / 12 / 18 кредит",
      description:
        "Nano Banana 2 нь resolution-оосоо хамаарч 1K-д 8 кредит, 2K-д 12 кредит, 4K-д 18 кредит байна.",
      bullets: [
        "1K: 8 кредит ≈ $0.04",
        "2K: 12 кредит ≈ $0.06",
        "4K: 18 кредит ≈ $0.09",
        "High-tier top-up effective үнэ: ≈ $0.036 / $0.054 / $0.081",
      ],
    };
  }

  return {
    title: "Тусгай pricing",
    description: "Энэ model-д одоогоор тусгай pricing тайлбар тохируулаагүй байна.",
    bullets: [],
  };
}
