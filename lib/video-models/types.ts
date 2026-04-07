export const VIDEO_DURATIONS = [5, 8, 10] as const;
export const VIDEO_QUALITIES = ["720p", "1080p"] as const;
export const VIDEO_ASPECT_RATIOS = ["Auto", "16:9", "9:16"] as const;
export const VEO_SEED_MIN = 10000;
export const VEO_SEED_MAX = 99999;

export type VideoDuration = (typeof VIDEO_DURATIONS)[number];
export type VideoQuality = (typeof VIDEO_QUALITIES)[number];
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[number];

export type VideoGenerationInput = {
  modelName: string;
  prompt: string;
  imageUrl: string;
  duration: VideoDuration;
  quality: VideoQuality;
  aspectRatio?: VideoAspectRatio;
  seed?: number;
};

export type VideoGenerationOutput = {
  videoUrl: string;
  rawResponse: unknown;
  duration?: number;
  quality?: VideoQuality;
  seed?: number;
};

export type VideoModelProvider = {
  name: string;
  generateVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput>;
};

export class VideoModelError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "VideoModelError";
    this.status = status;
  }
}
