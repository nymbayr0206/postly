import { getServerEnv } from "@/lib/env";
import {
  type VideoGenerationInput,
  type VideoGenerationOutput,
  VideoModelError,
} from "@/lib/video-models/types";

const POLL_INTERVAL_MS = 5000;

type CreateResponse = {
  code: number;
  msg: string;
  data?: { taskId: string };
};

type PollState = "waiting" | "queuing" | "generating" | "success" | "fail";

type VideoInfo = {
  videoId?: string;
  videoUrl?: string;
  imageUrl?: string;
};

type PollResponse = {
  code: number;
  msg: string;
  data?: {
    taskId?: string;
    state?: PollState;
    videoInfo?: VideoInfo;
    // fallback fields some API versions may use
    video_url?: string;
    videoUrl?: string;
    failMsg?: string;
    resultJson?: string;
  };
};

function extractVideoUrl(data: PollResponse["data"]): string | null {
  if (!data) return null;

  // Primary: nested videoInfo object (documented structure)
  if (data.videoInfo?.videoUrl) return data.videoInfo.videoUrl;

  // Fallback: direct fields
  if (data.video_url) return data.video_url;
  if (data.videoUrl) return data.videoUrl;

  // Fallback: resultJson string
  if (data.resultJson) {
    try {
      const parsed = JSON.parse(data.resultJson) as Record<string, unknown>;
      // Check for nested videoInfo
      const vi = parsed["videoInfo"] as Record<string, unknown> | undefined;
      if (vi?.videoUrl && typeof vi.videoUrl === "string") return vi.videoUrl;
      for (const key of ["video_url", "videoUrl", "url", "output_url"]) {
        const val = parsed[key];
        if (typeof val === "string" && val.startsWith("http")) return val;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export class RunwayProvider {
  name = "runway";

  async generateVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
    const { runwayApiKey, runwayGenerateUrl, runwayPollUrl, runwayTimeoutMs } = getServerEnv();

    if (!input.prompt.trim()) {
      throw new VideoModelError("Промпт заавал шаардлагатай.", 400);
    }

    if (!input.imageUrl.startsWith("http")) {
      throw new VideoModelError("Хүчинтэй зургийн холбоос шаардлагатай.", 400);
    }

    // 1080p does not support 10-second videos
    if (input.quality === "1080p" && input.duration === 10) {
      throw new VideoModelError("1080p чанар зөвхөн 5 секундын видеод дэмжигдэнэ.", 400);
    }

    const deadline = Date.now() + runwayTimeoutMs;

    // Step 1: Create task
    let createRes: Response;
    try {
      createRes = await fetch(runwayGenerateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${runwayApiKey}`,
        },
        body: JSON.stringify({
          prompt: input.prompt,
          imageUrl: input.imageUrl,
          duration: input.duration,
          quality: input.quality,
          waterMark: "",
        }),
      });
    } catch {
      throw new VideoModelError("Одоогоор Runway API-д холбогдож чадсангүй.", 502);
    }

    let createData: CreateResponse;
    try {
      createData = (await createRes.json()) as CreateResponse;
    } catch {
      throw new VideoModelError("Runway-аас ирсэн хариу буруу байна.", 502);
    }

    if (!createRes.ok || !createData.data?.taskId) {
      console.error("[generate-video] create failed:", createData);
      throw new VideoModelError(
        "Runway үүсгэлтийн даалгаврыг эхлүүлж чадсангүй. Дахин оролдоно уу.",
        createRes.status >= 500 ? 502 : 400,
      );
    }

    const taskId = createData.data.taskId;
    console.log("[generate-video] taskId:", taskId);

    // Step 2: Poll
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      let pollRes: Response;
      try {
        pollRes = await fetch(`${runwayPollUrl}?taskId=${taskId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${runwayApiKey}` },
        });
      } catch {
        throw new VideoModelError("Одоогоор Runway API-д холбогдож чадсангүй.", 502);
      }

      let pollData: PollResponse;
      try {
        pollData = (await pollRes.json()) as PollResponse;
      } catch {
        throw new VideoModelError("Runway төлөв шалгах хариу буруу байна.", 502);
      }

      const state = pollData.data?.state;
      console.log("[generate-video] poll state:", state);

      if (state === "success") {
        console.log("[generate-video] full success response:", JSON.stringify(pollData, null, 2));
        const videoUrl = extractVideoUrl(pollData.data);
        if (!videoUrl) {
          throw new VideoModelError("Runway видеоны холбоос буцаасангүй.", 502);
        }
        return { videoUrl, rawResponse: pollData };
      }

      if (state === "fail") {
        throw new VideoModelError(
          pollData.data?.failMsg ?? "Runway үүсгэлт амжилтгүй боллоо. Дахин оролдоно уу.",
          502,
        );
      }
      // waiting / queuing / generating — keep polling
    }

    throw new VideoModelError("Runway хүсэлтийн хугацаа дууслаа. Дахин оролдоно уу.", 504);
  }
}
