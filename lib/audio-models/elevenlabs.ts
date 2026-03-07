import { getServerEnv } from "@/lib/env";
import {
  type AudioGenerationInput,
  type AudioGenerationOutput,
  AudioModelError,
} from "@/lib/audio-models/types";

const POLL_INTERVAL_MS = 3000;

type TaskState = "waiting" | "queuing" | "generating" | "success" | "fail";

type CreateTaskResponse = {
  code: number;
  msg: string;
  data?: { taskId: string; recordId?: string };
};

type RecordInfoResponse = {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    state: TaskState;
    resultJson?: string;
    failMsg?: string;
  };
};

function getBaseApiUrl(createTaskUrl: string): string {
  return createTaskUrl.replace(/\/createTask$/, "");
}

function extractAudioUrl(resultJson: string | undefined): string | null {
  if (!resultJson) return null;

  try {
    const parsed = JSON.parse(resultJson) as Record<string, unknown>;

    // Common keys the API might use
    for (const key of ["audio_url", "audioUrl", "url", "output_url"]) {
      const val = parsed[key];
      if (typeof val === "string" && val.length > 0) return val;
    }

    // Nested in resultUrls array
    const urls = parsed["resultUrls"];
    if (Array.isArray(urls) && typeof urls[0] === "string") return urls[0];

    const data = parsed["data"];
    if (data && typeof data === "object") {
      const nested = data as Record<string, unknown>;
      for (const key of ["audio_url", "audioUrl", "url"]) {
        const val = nested[key];
        if (typeof val === "string" && val.length > 0) return val;
      }
    }
  } catch {
    if (typeof resultJson === "string" && resultJson.startsWith("http")) {
      return resultJson;
    }
  }

  return null;
}

export class ElevenLabsProvider {
  name = "elevenlabs";

  async generateAudio(input: AudioGenerationInput): Promise<AudioGenerationOutput> {
    const { elevenlabsApiKey, elevenlabsApiUrl, elevenlabsTimeoutMs, elevenlabsModelName } =
      getServerEnv();

    if (!input.dialogue || input.dialogue.length === 0) {
      throw new AudioModelError("At least one dialogue line is required.", 400);
    }

    const baseUrl = getBaseApiUrl(elevenlabsApiUrl);
    const deadline = Date.now() + elevenlabsTimeoutMs;

    // Step 1: Create task
    let createResponse: Response;
    try {
      createResponse = await fetch(elevenlabsApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${elevenlabsApiKey}`,
        },
        body: JSON.stringify({
          model: elevenlabsModelName,
          input: {
            dialogue: input.dialogue,
            stability: input.stability ?? 0.5,
          },
        }),
      });
    } catch {
      throw new AudioModelError("Unable to reach ElevenLabs API at the moment.", 502);
    }

    let createData: CreateTaskResponse;
    try {
      createData = (await createResponse.json()) as CreateTaskResponse;
    } catch {
      throw new AudioModelError("Invalid response from ElevenLabs API.", 502);
    }

    if (!createResponse.ok || !createData.data?.taskId) {
      throw new AudioModelError(
        "ElevenLabs task creation failed. Please try again shortly.",
        createResponse.status >= 500 ? 502 : 400,
      );
    }

    const taskId = createData.data.taskId;
    console.log("[generate-audio] taskId:", taskId);

    // Step 2: Poll for completion
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let pollResponse: Response;
      try {
        pollResponse = await fetch(`${baseUrl}/recordInfo?taskId=${taskId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${elevenlabsApiKey}` },
        });
      } catch {
        throw new AudioModelError("Unable to reach ElevenLabs API at the moment.", 502);
      }

      let pollData: RecordInfoResponse;
      try {
        pollData = (await pollResponse.json()) as RecordInfoResponse;
      } catch {
        throw new AudioModelError("Invalid poll response from ElevenLabs API.", 502);
      }

      const state = pollData.data?.state;
      console.log("[generate-audio] poll state:", state);

      if (state === "success") {
        const audioUrl = extractAudioUrl(pollData.data?.resultJson);
        if (!audioUrl) {
          throw new AudioModelError("ElevenLabs did not return an audio URL.", 502);
        }
        return { audioUrl, rawResponse: pollData };
      }

      if (state === "fail") {
        throw new AudioModelError(
          pollData.data?.failMsg ?? "ElevenLabs generation failed. Please try again shortly.",
          502,
        );
      }
      // waiting / queuing / generating — keep polling
    }

    throw new AudioModelError("ElevenLabs request timed out. Please try again.", 504);
  }
}
