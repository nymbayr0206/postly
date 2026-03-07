export const ASPECT_RATIOS = ["1:1", "4:5", "16:9"] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export type ImageGenerationInput = {
  prompt: string;
  aspectRatio: AspectRatio;
  referenceImages: string[];
};

export type ImageGenerationOutput = {
  imageUrl: string;
  rawResponse: unknown;
};

export type ImageModelProvider = {
  name: string;
  generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
};

export class ImageModelError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ImageModelError";
    this.status = status;
  }
}

