"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechToTextControlProps = {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
};

type SpeechLanguage = "mn" | "en";

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

function getPreferredMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "audio/webm";
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return "mp3";
  }

  if (mimeType.includes("wav")) {
    return "wav";
  }

  return "webm";
}

export function SpeechToTextControl({
  value,
  onChange,
  className,
}: SpeechToTextControlProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const valueRef = useRef(value);
  const [language, setLanguage] = useState<SpeechLanguage>("mn");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const isSupported = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== "undefined" &&
      typeof MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setRecordingSeconds((previous) => previous + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      streamRef.current = null;
    };
  }, []);

  async function transcribeBlob(blob: Blob, mimeType: string) {
    const extension = getExtensionFromMimeType(mimeType);
    const file = new File([blob], `speech.${extension}`, { type: mimeType || "audio/webm" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    const response = await fetch("/api/speech-to-text", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as { text?: string; error?: string } | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Яриаг текст болгож чадсангүй.");
    }

    if (!payload?.text?.trim()) {
      throw new Error("Ярианаас текст танигдсангүй.");
    }

    onChange(appendTranscript(valueRef.current, payload.text));
  }

  async function startRecording() {
    if (!isSupported) {
      setError("Энэ browser дээр микрофон бичлэг дэмжигдэхгүй байна.");
      return;
    }

    if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setError("Микрофон бичлэг нь HTTPS эсвэл localhost орчинд ажиллана.");
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });

      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);

        if (audioBlob.size === 0) {
          setError("Бичлэг хоосон байна. Дахин оролдоно уу.");
          return;
        }

        try {
          setIsTranscribing(true);
          await transcribeBlob(audioBlob, recorder.mimeType || mimeType);
        } catch (transcriptionError) {
          setError(
            transcriptionError instanceof Error
              ? transcriptionError.message
              : "Яриаг текст болгож чадсангүй.",
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      setRecordingSeconds(0);
      setIsRecording(true);
    } catch (recordingError) {
      if (recordingError instanceof DOMException && recordingError.name === "NotAllowedError") {
        setError("Микрофоны зөвшөөрлөө нээгээд дахин оролдоно уу.");
        return;
      }

      setError("Микрофон эхлүүлэх үед алдаа гарлаа. Browser-оо дахин ачаалаад оролдоно уу.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 rounded-[1rem] border border-cyan-100 bg-cyan-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-700">
            Ярианаас текст
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Микрофоноор хэлсэн үг OpenAI Whisper-аар хөрвөж таны тайлбар дээр нэмэгдэнэ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as SpeechLanguage)}
            disabled={isRecording || isTranscribing}
            className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:opacity-60"
          >
            <option value="mn">Монгол</option>
            <option value="en">Англи</option>
          </select>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isSupported || isTranscribing}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
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

      {isRecording ? (
        <p className="mt-2 rounded-[0.9rem] border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
          Бичиж байна... {recordingSeconds} сек
        </p>
      ) : null}

      {isTranscribing ? (
        <p className="mt-2 rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Whisper руу илгээж, текст болгон хөрвүүлж байна...
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
    </div>
  );
}
