import { getVeoEnv } from "@/lib/env";
import {
  type VideoExtensionInput,
  type VideoGenerationInput,
  type VideoGenerationOutput,
  type VideoQuality,
  VideoModelError,
} from "@/lib/video-models/types";

const POLL_INTERVAL_MS = 5000;
const HD_POLL_INTERVAL_MS = 25000;

type VeoCreateResponse = {
  code: number;
  msg: string;
  data?: {
    taskId?: string;
  };
};

type VeoDetailsResponse = {
  code: number;
  msg: string;
  data?: {
    taskId?: string;
    paramJson?: string | null;
    promptJson?: string | null;
    successFlag?: number;
    errorMessage?: string | null;
    fallbackFlag?: boolean;
    info?: {
      resultUrls?: string[];
      originUrls?: string[];
      resolution?: string;
      paramJson?: string | null;
      promptJson?: string | null;
    };
    response?: {
      taskId?: string;
      resultUrls?: string[];
      originUrls?: string[];
      resolution?: string;
      paramJson?: string | null;
      promptJson?: string | null;
    };
  };
};

type VeoUpgradeResponse = {
  code: number;
  msg: string;
  data?: {
    resultUrl?: string;
  };
};

function extractVeoVideoUrl(data: VeoDetailsResponse["data"]) {
  return (
    data?.response?.resultUrls?.[0] ??
    data?.response?.originUrls?.[0] ??
    data?.info?.resultUrls?.[0] ??
    data?.info?.originUrls?.[0] ??
    null
  );
}

function normalizeSeedValue(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return undefined;
}

function extractSeedFromObject(value: unknown): number | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  for (const key of ["seed", "seeds", "randomSeed", "random_seed"]) {
    const next = normalizeSeedValue(record[key]);
    if (next !== undefined) {
      return next;
    }
  }

  for (const nestedKey of ["params", "param", "data", "request", "input", "metadata"]) {
    const next = extractSeedFromObject(record[nestedKey]);
    if (next !== undefined) {
      return next;
    }
  }

  return undefined;
}

function extractSeedFromJsonSource(source: unknown) {
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      return extractSeedFromObject(JSON.parse(trimmed));
    } catch {
      return undefined;
    }
  }

  return extractSeedFromObject(source);
}

function extractVeoSeed(data: VeoDetailsResponse["data"], fallbackSeed?: number) {
  const directDataSeed = extractSeedFromObject(data);
  if (directDataSeed !== undefined) {
    return directDataSeed;
  }

  for (const source of [
    data?.paramJson,
    data?.promptJson,
    data?.response?.paramJson,
    data?.response?.promptJson,
    data?.info?.paramJson,
    data?.info?.promptJson,
  ]) {
    const parsedSeed = extractSeedFromJsonSource(source);
    if (parsedSeed !== undefined) {
      return parsedSeed;
    }
  }

  return fallbackSeed;
}

function getKieErrorMessage(message: string, fallbackMessage: string) {
  const normalized = message.trim();
  return normalized ? normalized : fallbackMessage;
}

function getVeoExtendModelName(modelName: string) {
  if (modelName === "veo3_fast") {
    return "fast";
  }

  if (modelName === "veo3") {
    return "quality";
  }

  throw new VideoModelError("Extend зөвхөн Veo 3.1 Fast эсвэл Veo 3 Quality дээр ажиллана.", 400);
}

export class VeoProvider {
  name = "veo";

  async generateVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
    const { veoApiKey, veoGenerateUrl, veoPollUrl, veo1080pUrl, veoTimeoutMs } = getVeoEnv();

    if (!input.prompt.trim()) {
      throw new VideoModelError("Промпт заавал шаардлагатай.", 400);
    }

    if (!input.imageUrl.startsWith("http")) {
      throw new VideoModelError("Хүчинтэй зургийн холбоос шаардлагатай.", 400);
    }

    const deadline = Date.now() + veoTimeoutMs;
    const taskId = await this.createTask({
      veoApiKey,
      endpoint: veoGenerateUrl,
      body: {
        prompt: input.prompt,
        imageUrls: [input.imageUrl],
        model: input.modelName,
        aspect_ratio: input.aspectRatio ?? "Auto",
        ...(input.seed === undefined ? {} : { seeds: input.seed }),
        enableTranslation: true,
        enableFallback: false,
        generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO",
        watermark: "",
      },
      fallbackMessage: "Veo үүсгэлтийн даалгаврыг эхлүүлж чадсангүй. Дахин оролдоно уу.",
    });

    return this.waitForTaskResult({
      veoApiKey,
      veoPollUrl,
      veo1080pUrl,
      taskId,
      quality: input.quality,
      duration: input.duration,
      fallbackSeed: input.seed,
      deadline,
    });
  }

  async extendVideo(input: VideoExtensionInput): Promise<VideoGenerationOutput> {
    const { veoApiKey, veoExtendUrl, veoPollUrl, veo1080pUrl, veoTimeoutMs } = getVeoEnv();

    if (!input.prompt.trim()) {
      throw new VideoModelError("Промпт заавал шаардлагатай.", 400);
    }

    if (!input.sourceTaskId.trim()) {
      throw new VideoModelError("Үргэлжлүүлэх Veo task id олдсонгүй.", 400);
    }

    const deadline = Date.now() + veoTimeoutMs;
    const taskId = await this.createTask({
      veoApiKey,
      endpoint: veoExtendUrl,
      body: {
        taskId: input.sourceTaskId,
        prompt: input.prompt,
        ...(input.seed === undefined ? {} : { seeds: input.seed }),
        watermark: "",
        model: getVeoExtendModelName(input.modelName),
      },
      fallbackMessage: "Veo continue task-ийг эхлүүлж чадсангүй. Дахин оролдоно уу.",
    });

    return this.waitForTaskResult({
      veoApiKey,
      veoPollUrl,
      veo1080pUrl,
      taskId,
      quality: input.quality,
      duration: 8,
      fallbackSeed: input.seed,
      deadline,
    });
  }

  private async createTask(params: {
    veoApiKey: string;
    endpoint: string;
    body: Record<string, unknown>;
    fallbackMessage: string;
  }) {
    const { veoApiKey, endpoint, body, fallbackMessage } = params;

    let createResponse: Response;

    try {
      createResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${veoApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new VideoModelError("Одоогоор Veo API-д холбогдож чадсангүй.", 502);
    }

    let createData: VeoCreateResponse;

    try {
      createData = (await createResponse.json()) as VeoCreateResponse;
    } catch {
      throw new VideoModelError("Veo-оос ирсэн хариу буруу байна.", 502);
    }

    const taskId = createData.data?.taskId;

    if (!createResponse.ok || !taskId) {
      throw new VideoModelError(
        getKieErrorMessage(createData.msg, fallbackMessage),
        createResponse.status >= 500 ? 502 : 400,
      );
    }

    return taskId;
  }

  private async waitForTaskResult(params: {
    veoApiKey: string;
    veoPollUrl: string;
    veo1080pUrl: string;
    taskId: string;
    quality: VideoQuality;
    duration: number;
    fallbackSeed?: number;
    deadline: number;
  }): Promise<VideoGenerationOutput> {
    const {
      veoApiKey,
      veoPollUrl,
      veo1080pUrl,
      taskId,
      quality,
      duration,
      fallbackSeed,
      deadline,
    } = params;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let detailsResponse: Response;

      try {
        detailsResponse = await fetch(`${veoPollUrl}?taskId=${encodeURIComponent(taskId)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${veoApiKey}` },
        });
      } catch {
        throw new VideoModelError("Одоогоор Veo API-д холбогдож чадсангүй.", 502);
      }

      let detailsData: VeoDetailsResponse;

      try {
        detailsData = (await detailsResponse.json()) as VeoDetailsResponse;
      } catch {
        throw new VideoModelError("Veo төлөв шалгах хариу буруу байна.", 502);
      }

      const successFlag = detailsData.data?.successFlag;

      if (successFlag === 1) {
        const standardVideoUrl = extractVeoVideoUrl(detailsData.data);
        const resolvedSeed = extractVeoSeed(detailsData.data, fallbackSeed);

        if (!standardVideoUrl) {
          throw new VideoModelError("Veo видеоны холбоос буцаасангүй.", 502);
        }

        if (quality !== "1080p") {
          return {
            videoUrl: standardVideoUrl,
            rawResponse: detailsData,
            duration,
            quality,
            seed: resolvedSeed,
            providerTaskId: taskId,
          };
        }

        const hdVideoUrl = await this.waitFor1080pVideo({
          veoApiKey,
          veo1080pUrl,
          taskId,
          deadline,
        });

        return {
          videoUrl: hdVideoUrl,
          rawResponse: {
            generation: detailsData,
            upgrade1080p: hdVideoUrl,
          },
          duration,
          quality,
          seed: resolvedSeed,
          providerTaskId: taskId,
        };
      }

      if (successFlag === 2 || successFlag === 3) {
        throw new VideoModelError(
          getKieErrorMessage(
            detailsData.data?.errorMessage ?? detailsData.msg,
            "Veo үүсгэлт амжилтгүй боллоо. Дахин оролдоно уу.",
          ),
          502,
        );
      }
    }

    throw new VideoModelError("Veo хүсэлтийн хугацаа дууслаа. Дахин оролдоно уу.", 504);
  }

  private async waitFor1080pVideo(params: {
    veoApiKey: string;
    veo1080pUrl: string;
    taskId: string;
    deadline: number;
  }) {
    const { veoApiKey, veo1080pUrl, taskId, deadline } = params;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, HD_POLL_INTERVAL_MS));

      let response: Response;

      try {
        response = await fetch(
          `${veo1080pUrl}?taskId=${encodeURIComponent(taskId)}&index=0`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${veoApiKey}` },
          },
        );
      } catch {
        throw new VideoModelError("Veo 1080p хувилбарыг авах үед сүлжээний алдаа гарлаа.", 502);
      }

      let payload: VeoUpgradeResponse | null = null;

      try {
        payload = (await response.json()) as VeoUpgradeResponse;
      } catch {
        payload = null;
      }

      const resultUrl = payload?.data?.resultUrl?.trim();

      if (response.ok && resultUrl) {
        return resultUrl;
      }

      if (response.status === 400 || response.status === 404 || response.status === 422) {
        continue;
      }

      if (response.status === 401) {
        throw new VideoModelError("Veo 1080p хүсэлтийн API key хүчингүй байна.", 502);
      }

      if (response.status >= 500) {
        throw new VideoModelError("Veo 1080p upgrade түр ажиллахгүй байна.", 502);
      }

      throw new VideoModelError(
        getKieErrorMessage(payload?.msg ?? "", "Veo 1080p хувилбарыг гаргаж чадсангүй."),
        400,
      );
    }

    throw new VideoModelError(
      "Veo 1080p хувилбар бэлэн болоход хэт удаж байна. Дахин оролдоно уу.",
      504,
    );
  }
}
