import { RunwayProvider } from "@/lib/video-models/runway";
import type { VideoModelProvider } from "@/lib/video-models/types";

const runwayProvider = new RunwayProvider();

const providers = new Map<string, VideoModelProvider>([
  ["runway", runwayProvider],
  ["runway/gen4-turbo", runwayProvider],
]);

export function getVideoModelProvider(modelName: string): VideoModelProvider {
  const provider = providers.get(modelName);

  if (!provider) {
    throw new Error(`Unsupported video model: ${modelName}`);
  }

  return provider;
}
