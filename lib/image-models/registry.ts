import { NanoBananaProvider } from "@/lib/image-models/nanobanana";
import type { ImageModelProvider } from "@/lib/image-models/types";

const nanoBananaProvider = new NanoBananaProvider();

const providers = new Map<string, ImageModelProvider>([
  ["nanobanana", nanoBananaProvider],
  ["nano-banana-2", nanoBananaProvider],
]);

export function getImageModelProvider(modelName: string) {
  const provider = providers.get(modelName);

  if (!provider) {
    throw new Error(`Unsupported image model: ${modelName}`);
  }

  return provider;
}

