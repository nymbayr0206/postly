import { getNanoBananaEnv } from "@/lib/env";
import {
  type ImageGenerationInput,
  type ImageGenerationOutput,
  ImageModelError,
} from "@/lib/image-models/types";

const POLL_INTERVAL_MS = 3000;

type TaskState = "waiting" | "queuing" | "generating" | "success" | "fail";

type CreateTaskResponse = {
  code: number;
  msg: string;
  data?: { taskId: string };
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

type ResultJson = {
  resultUrls?: string[];
  url?: string;
  imageUrl?: string;
};

function getBaseApiUrl(createTaskUrl: string): string {
  // e.g. https://api.kie.ai/api/v1/jobs/createTask -> https://api.kie.ai/api/v1/jobs
  return createTaskUrl.replace(/\/createTask$/, "");
}

function extractImageUrl(resultJson: string | undefined): string | null {
  if (!resultJson) return null;

  try {
    const parsed: ResultJson = JSON.parse(resultJson);

    if (parsed.resultUrls && parsed.resultUrls.length > 0) {
      return parsed.resultUrls[0];
    }
    if (parsed.url) return parsed.url;
    if (parsed.imageUrl) return parsed.imageUrl;
  } catch {
    // resultJson might itself be a URL string
    if (typeof resultJson === "string" && resultJson.startsWith("http")) {
      return resultJson;
    }
  }

  return null;
}

export class NanoBananaProvider {
  name = "nanobanana";

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    const { nanoBananaApiKey, nanoBananaApiUrl, nanoBananaTimeoutMs, nanoBananaModelName } =
      getNanoBananaEnv();

    if (!input.prompt.trim()) {
      throw new ImageModelError("Промпт заавал шаардлагатай.", 400);
    }

    if (
      input.referenceImages.some(
        (ref) => !ref.startsWith("data:image/") && !ref.startsWith("http"),
      )
    ) {
      throw new ImageModelError(
        "Лавлах зургууд нь HTTP(S) холбоос эсвэл image data URL байх ёстой.",
        400,
      );
    }

    const baseUrl = getBaseApiUrl(nanoBananaApiUrl);
    const deadline = Date.now() + nanoBananaTimeoutMs;

    // Step 1: Create the task
    let createResponse: Response;
    try {
      createResponse = await fetch(nanoBananaApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${nanoBananaApiKey}`,
        },
        body: JSON.stringify({
          model: nanoBananaModelName,
          input: {
            prompt: input.prompt,
            aspect_ratio: input.aspectRatio,
            image_input: input.referenceImages,
          },
        }),
      });
    } catch {
      throw new ImageModelError("Одоогоор NanoBanana API-д холбогдож чадсангүй.", 502);
    }

    let createData: CreateTaskResponse;
    try {
      createData = (await createResponse.json()) as CreateTaskResponse;
    } catch {
      throw new ImageModelError("NanoBanana-аас ирсэн хариу буруу байна.", 502);
    }

    if (!createResponse.ok || !createData.data?.taskId) {
      throw new ImageModelError(
        "NanoBanana үүсгэлтийн даалгаврыг эхлүүлж чадсангүй. Дахин оролдоно уу.",
        createResponse.status >= 500 ? 502 : 400,
      );
    }

    const taskId = createData.data.taskId;

    // Step 2: Poll for completion
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let pollResponse: Response;
      try {
        pollResponse = await fetch(`${baseUrl}/recordInfo?taskId=${taskId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${nanoBananaApiKey}`,
          },
        });
      } catch {
        throw new ImageModelError("Одоогоор NanoBanana API-д холбогдож чадсангүй.", 502);
      }

      let pollData: RecordInfoResponse;
      try {
        pollData = (await pollResponse.json()) as RecordInfoResponse;
      } catch {
        throw new ImageModelError("NanoBanana төлөв шалгах хариу буруу байна.", 502);
      }

      const state = pollData.data?.state;

      if (state === "success") {
        const imageUrl = extractImageUrl(pollData.data?.resultJson);

        if (!imageUrl) {
          throw new ImageModelError("NanoBanana зургийн холбоос буцаасангүй.", 502);
        }

        return { imageUrl, rawResponse: pollData };
      }

      if (state === "fail") {
        throw new ImageModelError(
          pollData.data?.failMsg ?? "NanoBanana үүсгэлт амжилтгүй боллоо. Дахин оролдоно уу.",
          502,
        );
      }

      // state is waiting / queuing / generating — keep polling
    }

    throw new ImageModelError("NanoBanana хүсэлтийн хугацаа дууслаа. Дахин оролдоно уу.", 504);
  }
}
