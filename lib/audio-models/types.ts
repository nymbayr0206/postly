export const ELEVENLABS_VOICES = [
  "RILOU7YmBhvwJGDGjNmP",
  "Z3R5wn05IrDiVCyEkUrK",
  "st7NwhTPEzqo2riw7qWC",
  "YOq2y2Up4RgXP2HyXjE5",
  "NOpBlnGInO9m6vDvFkFC",
  "x70vRnQBMBu4FAYhjJbO",
] as const;

export type ElevenLabsVoice = (typeof ELEVENLABS_VOICES)[number];

export const ELEVENLABS_VOICE_OPTIONS = [
  { id: "RILOU7YmBhvwJGDGjNmP", label: "Жинжиймаа", group: "Эмэгтэй" },
  { id: "Z3R5wn05IrDiVCyEkUrK", label: "Уянгалаг Уянга", group: "Эмэгтэй" },
  { id: "st7NwhTPEzqo2riw7qWC", label: "Цоглог Цогзолмаа", group: "Эмэгтэй" },
  { id: "YOq2y2Up4RgXP2HyXjE5", label: "Батаа", group: "Эрэгтэй" },
  { id: "NOpBlnGInO9m6vDvFkFC", label: "Улмаа", group: "Эрэгтэй" },
  { id: "x70vRnQBMBu4FAYhjJbO", label: "Наабаа", group: "Эрэгтэй" },
] as const satisfies ReadonlyArray<{
  id: ElevenLabsVoice;
  label: string;
  group: "Эмэгтэй" | "Эрэгтэй";
}>;

export const DEFAULT_DIALOGUE_VOICES = {
  female: ELEVENLABS_VOICE_OPTIONS[0].id,
  male: ELEVENLABS_VOICE_OPTIONS[3].id,
} as const;

export function getElevenLabsVoiceLabel(voiceId: string) {
  return ELEVENLABS_VOICE_OPTIONS.find((voice) => voice.id === voiceId)?.label ?? voiceId;
}

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
