import type { VideoDuration, VideoQuality } from "@/lib/video-models/types";

export const VIDEO_MODEL_NAMES = ["runway/gen4-turbo", "veo3_fast", "veo3"] as const;

export type VideoModelName = (typeof VIDEO_MODEL_NAMES)[number];

export type VideoModelCatalogItem = {
  name: VideoModelName;
  label: string;
  provider: "runway" | "veo";
  description: string;
  durationOptions: readonly VideoDuration[];
  qualityOptions: readonly VideoQuality[];
  defaultDuration: VideoDuration;
  defaultQuality: VideoQuality;
  defaultBaseCost: number;
};

const VIDEO_MODEL_CATALOG: readonly VideoModelCatalogItem[] = [
  {
    name: "runway/gen4-turbo",
    label: "Runway Gen-4 Turbo",
    provider: "runway",
    description: "5 эсвэл 10 секундын зурагнаас видео generation.",
    durationOptions: [5, 10],
    qualityOptions: ["720p", "1080p"],
    defaultDuration: 5,
    defaultQuality: "720p",
    defaultBaseCost: 12,
  },
  {
    name: "veo3_fast",
    label: "Veo 3.1 Fast",
    provider: "veo",
    description: "KIE Veo fast mode, native 16:9/9:16, fixed 8 секунд.",
    durationOptions: [8],
    qualityOptions: ["720p", "1080p"],
    defaultDuration: 8,
    defaultQuality: "720p",
    defaultBaseCost: 12,
  },
  {
    name: "veo3",
    label: "Veo 3 Quality",
    provider: "veo",
    description: "KIE Veo quality mode, fixed 8 секунд, илүү cinematic output.",
    durationOptions: [8],
    qualityOptions: ["720p", "1080p"],
    defaultDuration: 8,
    defaultQuality: "720p",
    defaultBaseCost: 50,
  },
] as const;

export function isVideoModelName(value: string): value is VideoModelName {
  return VIDEO_MODEL_NAMES.includes(value as VideoModelName);
}

export function getVideoModelCatalogItem(modelName: string) {
  return VIDEO_MODEL_CATALOG.find((item) => item.name === modelName) ?? null;
}

export function getVideoModelCatalogOrThrow(modelName: string) {
  const item = getVideoModelCatalogItem(modelName);

  if (!item) {
    throw new Error(`Unsupported video model: ${modelName}`);
  }

  return item;
}

export function getVideoRequestValidationError(
  modelName: string,
  duration: number,
  quality: string,
) {
  const model = getVideoModelCatalogItem(modelName);

  if (!model) {
    return "Дэмжигдэхгүй видео model байна.";
  }

  if (!model.durationOptions.includes(duration as VideoDuration)) {
    if (model.durationOptions.length === 1) {
      return `${model.label} зөвхөн ${model.durationOptions[0]} секундын видео дэмжинэ.`;
    }

    return `${model.label} ${model.durationOptions.join(", ")} секундын сонголтыг дэмжинэ.`;
  }

  if (!model.qualityOptions.includes(quality as VideoQuality)) {
    return `${model.label} ${model.qualityOptions.join(", ")} чанарыг дэмжинэ.`;
  }

  if (model.name === "runway/gen4-turbo" && quality === "1080p" && duration === 10) {
    return "1080p чанар зөвхөн 5 секундын видеод дэмжигдэнэ.";
  }

  return null;
}
