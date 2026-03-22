import { RunwayProvider } from "@/lib/video-models/runway";
import { VeoProvider } from "@/lib/video-models/veo";
import type { VideoModelProvider } from "@/lib/video-models/types";

const runwayProvider = new RunwayProvider();
const veoProvider = new VeoProvider();

const providers = new Map<string, VideoModelProvider>([
  ["runway", runwayProvider],
  ["runway/gen4-turbo", runwayProvider],
  ["veo", veoProvider],
  ["veo3_fast", veoProvider],
  ["veo3", veoProvider],
]);

export function getVideoModelProvider(modelName: string): VideoModelProvider {
  const provider = providers.get(modelName);

  if (!provider) {
    throw new Error(`Unsupported video model: ${modelName}`);
  }

  return provider;
}
