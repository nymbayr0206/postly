"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechToTextControlProps = {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
};

type SpeechLanguage = "mn-MN" | "en-US";

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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

function getSpeechErrorMessage(errorCode: string, language: SpeechLanguage) {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Микрофоны зөвшөөрлөө нээгээд дахин оролдоно уу.";
    case "no-speech":
      return "Яриа танигдсангүй. Микрофондоо ойрхон ярьж дахин оролдоно уу.";
    case "audio-capture":
      return "Микрофон олдсонгүй. Төхөөрөмжөө шалгаад дахин оролдоно уу.";
    case "network":
      return language === "mn-MN"
        ? "Монгол хэлний яриа таних үйлчилгээтэй холбогдож чадсангүй. Chrome эсвэл Edge-ийн сүүлийн хувилбар дээр дахин шалгаарай."
        : "Яриа таних үйлчилгээтэй холбогдож чадсангүй. Интернэт болон browser-оо шалгаад дахин оролдоно уу.";
    case "language-not-supported":
      return language === "mn-MN"
        ? "Энэ browser дээр Монгол хэлний speech-to-text дэмжигдээгүй байна. Chrome эсвэл Edge дээр шалгаарай."
        : "Сонгосон хэлний speech-to-text дэмжигдээгүй байна.";
    default:
      return "Яриаг текст болгох үед алдаа гарлаа.";
  }
}

export function SpeechToTextControl({
  value,
  onChange,
  className,
}: SpeechToTextControlProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);
  const ignoreNextAbortRef = useRef(false);
  const [language, setLanguage] = useState<SpeechLanguage>("mn-MN");
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isSupported = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => false,
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      ignoreNextAbortRef.current = true;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  function stopListening() {
    ignoreNextAbortRef.current = true;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  }

  function startListening() {
    if (!isSupported || typeof window === "undefined") {
      setError("Таны browser ярианаас текст болгох боломжийг дэмжихгүй байна.");
      return;
    }

    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setError("Speech-to-text нь HTTPS эсвэл localhost орчинд ажиллана.");
      return;
    }

    setError(null);

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setError("Таны browser ярианаас текст болгох боломжийг дэмжихгүй байна.");
      return;
    }

    ignoreNextAbortRef.current = true;
    recognitionRef.current?.stop();

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let nextInterim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          nextInterim += transcript;
        }
      }

      if (finalTranscript.trim()) {
        onChange(appendTranscript(valueRef.current, finalTranscript));
      }

      setInterimText(nextInterim.trim());
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setInterimText("");

      if (event.error === "aborted" && ignoreNextAbortRef.current) {
        ignoreNextAbortRef.current = false;
        return;
      }

      setError(getSpeechErrorMessage(event.error, language));
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      ignoreNextAbortRef.current = false;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setError("Микрофон эхлүүлэх үед алдаа гарлаа. Browser-оо дахин ачаалаад оролдоно уу.");
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 rounded-[1rem] border border-cyan-100 bg-cyan-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-700">
            Ярианаас текст
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Микрофоноор хэлсэн үг таны тайлбар дээр автоматаар нэмэгдэнэ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as SpeechLanguage)}
            disabled={isListening}
            className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:opacity-60"
          >
            <option value="mn-MN">Монгол</option>
            <option value="en-US">Англи</option>
          </select>

          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isListening
                ? "bg-slate-950 text-white hover:bg-slate-800"
                : "bg-[linear-gradient(135deg,#31c4e8,#129fd5)] text-white hover:brightness-105"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current" />
            {isListening ? "Зогсоох" : "Микрофон асаах"}
          </button>
        </div>
      </div>

      {interimText ? (
        <p className="mt-2 rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Танигдаж байна: {interimText}
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-[0.9rem] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!isSupported ? (
        <p className="mt-2 rounded-[0.9rem] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Энэ browser дээр speech-to-text дэмжигдэхгүй байна. Chrome эсвэл Edge дээр шалгаарай.
        </p>
      ) : null}
    </div>
  );
}
