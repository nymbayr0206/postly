import { getVeoEnv } from "@/lib/env";
import {
  type VideoGenerationInput,
  type VideoGenerationOutput,
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
    successFlag?: number;
    errorMessage?: string | null;
    fallbackFlag?: boolean;
    response?: {
      taskId?: string;
      resultUrls?: string[];
      originUrls?: string[];
      resolution?: string;
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
  return data?.response?.resultUrls?.[0] ?? data?.response?.originUrls?.[0] ?? null;
}

function getKieErrorMessage(message: string, fallbackMessage: string) {
  const normalized = message.trim();
  return normalized ? normalized : fallbackMessage;
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

    let createResponse: Response;

    try {
      createResponse = await fetch(veoGenerateUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${veoApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: input.prompt,
          imageUrls: [input.imageUrl],
          model: input.modelName,
          aspect_ratio: input.aspectRatio ?? "Auto",
          ...(input.seed === undefined ? {} : { seeds: input.seed }),
          enableTranslation: true,
          enableFallback: false,
          generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO",
          watermark: "",
        }),
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
        getKieErrorMessage(createData.msg, "Veo үүсгэлтийн даалгаврыг эхлүүлж чадсангүй. Дахин оролдоно уу."),
        createResponse.status >= 500 ? 502 : 400,
      );
    }

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

        if (!standardVideoUrl) {
          throw new VideoModelError("Veo видеоны холбоос буцаасангүй.", 502);
        }

        if (input.quality !== "1080p") {
          return {
            videoUrl: standardVideoUrl,
            rawResponse: detailsData,
            duration: input.duration,
            quality: input.quality,
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
          duration: input.duration,
          quality: input.quality,
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

    throw new VideoModelError("Veo 1080p хувилбар бэлэн болоход хэт удаж байна. Дахин оролдоно уу.", 504);
  }
}
