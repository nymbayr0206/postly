"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechToTextControlProps = {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
};

type SpeechLanguage = "mn" | "en";
type TranscriptQualityRating = "high" | "medium" | "low";

type SpeechToTextResponse = {
  rawTranscript: string;
  cleanedTranscript: string;
  appliedTranscript: string;
  cleanMode: boolean;
  durationSeconds: number;
  quality: {
    rating: TranscriptQualityRating;
    providerStatus: string;
    providerConfidence: number | null;
    rawScriptMatchRatio: number;
    cleanedScriptMatchRatio: number;
    rawWordCount: number;
    cleanedWordCount: number;
    changedByCleanup: boolean;
  };
  models: {
    transcription: string;
    cleanup: string;
  };
};

type AudioContextWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const TARGET_SAMPLE_RATE = 16_000;
const MAX_RECORDING_SECONDS = 20;
const MIN_RMS_LEVEL = 0.003;

function appendTranscript(base: string, addition: string) {
  const trimmed = addition.trim();

  if (!trimmed) {
    return base;
  }

  if (!base.trim()) {
    return trimmed;
  }

  return `${base.trimEnd()} ${trimmed}`;
}

function getAudioContextCtor() {
  if (typeof window === "undefined") {
    return null;
  }

  const audioWindow = window as AudioContextWindow;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function mergeFloat32Chunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) {
  if (buffer.length === 0) {
    return new Float32Array();
  }

  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.max(1, Math.round(buffer.length / sampleRateRatio));
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.min(buffer.length, Math.round((offsetResult + 1) * sampleRateRatio));
    let accum = 0;
    let count = 0;

    for (let index = offsetBuffer; index < nextOffsetBuffer; index += 1) {
      accum += buffer[index] ?? 0;
      count += 1;
    }

    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function calculateRms(samples: Float32Array) {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    sum += sample * sample;
  }

  return Math.sqrt(sum / samples.length);
}

function getQualityLabel(rating: TranscriptQualityRating) {
  switch (rating) {
    case "high":
      return "Сайн";
    case "medium":
      return "Дунд";
    default:
      return "Шалгах";
  }
}

export function SpeechToTextControl({
  value,
  onChange,
  className,
}: SpeechToTextControlProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const inputSampleRateRef = useRef(TARGET_SAMPLE_RATE);
  const valueRef = useRef(value);
  const stopRecordingRef = useRef<(message?: string) => Promise<void>>(async () => undefined);
  const recordingStartedAtRef = useRef<number | null>(null);
  const autoStoppedRef = useRef(false);
  const stopInProgressRef = useRef(false);
  const isRecordingRef = useRef(false);
  const [language, setLanguage] = useState<SpeechLanguage>("mn");
  const [cleanMode, setCleanMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptResult, setTranscriptResult] = useState<SpeechToTextResponse | null>(null);
  const isSupported = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== "undefined" &&
      Boolean(getAudioContextCtor()) &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  });

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      const startedAt = recordingStartedAtRef.current;

      if (!startedAt) {
        return;
      }

      const elapsedSeconds = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
      setRecordingSeconds(elapsedSeconds);

      if (elapsedSeconds >= MAX_RECORDING_SECONDS && !autoStoppedRef.current) {
        autoStoppedRef.current = true;
        void stopRecordingRef.current("20 секунд хүрсэн тул бичлэгийг автоматаар зогсоолоо.");
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      void teardownAudioCapture();
    };
  }, []);

  async function teardownAudioCapture() {
    processorNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    gainNodeRef.current?.disconnect();

    if (processorNodeRef.current) {
      processorNodeRef.current.onaudioprocess = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      await audioContextRef.current.close().catch(() => undefined);
    }

    processorNodeRef.current = null;
    sourceNodeRef.current = null;
    gainNodeRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
  }

  async function transcribeWavBlob(blob: Blob, durationMs: number) {
    const file = new File([blob], "speech.wav", { type: "audio/wav" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    formData.append("clean_mode", String(cleanMode));
    formData.append("duration_ms", String(Math.round(durationMs)));

    const response = await fetch("/api/speech-to-text", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | (SpeechToTextResponse & { error?: string })
      | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Яриаг текст болгож чадсангүй.");
    }

    if (!payload?.appliedTranscript?.trim()) {
      throw new Error("Ярианаас текст танигдсангүй.");
    }

    setTranscriptResult(payload);
    onChange(appendTranscript(valueRef.current, payload.appliedTranscript));
    setInfo(
      payload.cleanedTranscript.trim() !== payload.rawTranscript.trim()
        ? "Цэвэрлэсэн transcript тайлбарт нэмэгдлээ. Доор raw болон cleaned хувилбарыг харьцуулж болно."
        : "Transcript тайлбарт нэмэгдлээ.",
    );
  }

  async function stopRecording(autoStopMessage?: string) {
    if (stopInProgressRef.current) {
      return;
    }

    stopInProgressRef.current = true;
    isRecordingRef.current = false;

    const durationMs = recordingStartedAtRef.current
      ? performance.now() - recordingStartedAtRef.current
      : recordingSeconds * 1000;
    const mergedPcm = mergeFloat32Chunks(pcmChunksRef.current);
    const downsampledPcm = downsampleBuffer(mergedPcm, inputSampleRateRef.current, TARGET_SAMPLE_RATE);
    const rmsLevel = calculateRms(downsampledPcm);

    await teardownAudioCapture();
    setIsRecording(false);
    recordingStartedAtRef.current = null;

    if (autoStopMessage) {
      setInfo(autoStopMessage);
    }

    if (downsampledPcm.length === 0) {
      setError("Бичлэг хоосон байна. Дахин оролдоно уу.");
      stopInProgressRef.current = false;
      return;
    }

    if (rmsLevel < MIN_RMS_LEVEL) {
      setError("Микрофоны дуу сул байна. Илүү ойр, тод яриад дахин оролдоно уу.");
      stopInProgressRef.current = false;
      return;
    }

    try {
      setIsTranscribing(true);
      const wavBuffer = encodeWav(downsampledPcm, TARGET_SAMPLE_RATE);
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
      await transcribeWavBlob(wavBlob, durationMs);
    } catch (transcriptionError) {
      setError(
        transcriptionError instanceof Error
          ? transcriptionError.message
          : "Яриаг текст болгож чадсангүй.",
      );
    } finally {
      setIsTranscribing(false);
      stopInProgressRef.current = false;
      pcmChunksRef.current = [];
    }
  }

  async function startRecording() {
    if (!isSupported) {
      setError("Энэ browser дээр микрофон бичлэг дэмжигдэхгүй байна.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      setError("Микрофон бичлэг нь HTTPS эсвэл localhost орчинд ажиллана.");
      return;
    }

    const AudioContextCtor = getAudioContextCtor();

    if (!AudioContextCtor) {
      setError("Audio capture ийн орчин дэмжигдэхгүй байна.");
      return;
    }

    try {
      setError(null);
      setInfo(null);
      pcmChunksRef.current = [];
      autoStoppedRef.current = false;
      stopInProgressRef.current = false;
      setTranscriptResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioContext = new AudioContextCtor();
      await audioContext.resume();
      inputSampleRateRef.current = audioContext.sampleRate;

      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;

      processorNode.onaudioprocess = (event) => {
        if (!isRecordingRef.current) {
          return;
        }

        const channelData = event.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(channelData));
      };

      sourceNode.connect(processorNode);
      processorNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      processorNodeRef.current = processorNode;
      gainNodeRef.current = gainNode;
      recordingStartedAtRef.current = performance.now();
      isRecordingRef.current = true;

      setRecordingSeconds(0);
      setIsRecording(true);
      setInfo("10-20 секундийн тод бичлэг хамгийн сайн танигдана.");
    } catch (recordingError) {
      await teardownAudioCapture();

      if (recordingError instanceof DOMException && recordingError.name === "NotAllowedError") {
        setError("Микрофоны зөвшөөрлөө нээгээд дахин оролдоно уу.");
        return;
      }

      setError("Микрофон эхлүүлэх үед алдаа гарлаа. Browser-оо дахин ачаалаад оролдоно уу.");
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 rounded-[1rem] border border-cyan-100 bg-cyan-50/70 p-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-700">
            Ярианаас текст
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Microsoft Speech-аар анхны transcript авч, дараа нь backend дээр цэвэрлээд таны
            тайлбар дээр нэмэгдүүлнэ.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as SpeechLanguage)}
            disabled={isRecording || isTranscribing}
            className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:opacity-60"
          >
            <option value="mn">Монгол</option>
            <option value="en">Англи</option>
          </select>

          <label className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={cleanMode}
              onChange={(event) => setCleanMode(event.target.checked)}
              disabled={isRecording || isTranscribing}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            Цэвэрлэх горим
          </label>

          <button
            type="button"
            onClick={() => void (isRecording ? stopRecording() : startRecording())}
            disabled={!isSupported || isTranscribing}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isRecording
                ? "bg-slate-950 text-white hover:bg-slate-800"
                : "bg-[linear-gradient(135deg,#31c4e8,#129fd5)] text-white hover:brightness-105"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current" />
            {isRecording ? "Бичлэг зогсоох" : "Микрофон асаах"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        10-20 секундийн тод, ойрын яриа хамгийн сайн танигдана. Clean mode асаавал дүүргэлт үг,
        тээнэгэлзлийг аюулгүй үед цэвэрлэнэ.
      </p>

      {isRecording ? (
        <p className="mt-2 rounded-[0.9rem] border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
          Бичиж байна... {recordingSeconds} сек
        </p>
      ) : null}

      {isTranscribing ? (
        <p className="mt-2 rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Chimege рүү илгээж transcript авч, дараа нь текстийг цэвэрлэж байна...
        </p>
      ) : null}

      {info ? (
        <p className="mt-2 rounded-[0.9rem] border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
          {info}
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-[0.9rem] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!isSupported ? (
        <p className="mt-2 rounded-[0.9rem] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Энэ browser дээр микрофон бичлэг дэмжигдэхгүй байна. Chrome эсвэл Edge дээр шалгаарай.
        </p>
      ) : null}

      {transcriptResult ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-[1rem] border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Raw transcript
              </p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Анхны хувилбар
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-800">{transcriptResult.rawTranscript}</p>
          </div>

          {transcriptResult.cleanedTranscript.trim() !== transcriptResult.rawTranscript.trim() ? (
            <div className="rounded-[1rem] border border-cyan-200 bg-cyan-50/60 p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-700">
                  Cleaned transcript
                </p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-cyan-700">
                  Тайлбарт нэмэгдсэн хувилбар
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-800">{transcriptResult.cleanedTranscript}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Хугацаа: {transcriptResult.durationSeconds.toFixed(1)} сек
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Чанар: {getQualityLabel(transcriptResult.quality.rating)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Confidence: {transcriptResult.quality.providerConfidence?.toFixed(2) ?? "-"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

