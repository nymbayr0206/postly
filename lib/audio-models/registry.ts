import { ElevenLabsProvider } from "@/lib/audio-models/elevenlabs";
import type { AudioModelProvider } from "@/lib/audio-models/types";

const elevenLabsProvider = new ElevenLabsProvider();

const providers = new Map<string, AudioModelProvider>([
  ["elevenlabs", elevenLabsProvider],
  ["elevenlabs/text-to-dialogue-v3", elevenLabsProvider],
]);

export function getAudioModelProvider(modelName: string): AudioModelProvider {
  const provider = providers.get(modelName);

  if (!provider) {
    throw new Error(`Unsupported audio model: ${modelName}`);
  }

  return provider;
}
