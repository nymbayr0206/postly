export const ELEVENLABS_VOICES = ["Adam", "Brian", "Roger", "Rachel", "Antoni"] as const;

export type ElevenLabsVoice = (typeof ELEVENLABS_VOICES)[number];

export type DialogueLine = {
  text: string;
  voice: ElevenLabsVoice;
};

export type AudioGenerationInput = {
  dialogue: DialogueLine[];
  stability?: number;
};

export type AudioGenerationOutput = {
  audioUrl: string;
  rawResponse: unknown;
};

export type AudioModelProvider = {
  name: string;
  generateAudio(input: AudioGenerationInput): Promise<AudioGenerationOutput>;
};

export class AudioModelError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AudioModelError";
    this.status = status;
  }
}
