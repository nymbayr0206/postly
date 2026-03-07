export const VIDEO_DURATIONS = [5, 10] as const;
export const VIDEO_QUALITIES = ["720p", "1080p"] as const;

export type VideoDuration = (typeof VIDEO_DURATIONS)[number];
export type VideoQuality = (typeof VIDEO_QUALITIES)[number];

export type VideoGenerationInput = {
  prompt: string;
  imageUrl: string;
  duration: VideoDuration;
  quality: VideoQuality;
};

export type VideoGenerationOutput = {
  videoUrl: string;
  rawResponse: unknown;
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
