"use client";

import { useTransition } from "react";
import { addToGalleryAction, removeFromGalleryAction } from "@/app/admin/actions";
import type { ImageAspectRatio } from "@/lib/types";

export type AdminGenerationRow = {
  id: string;
  user_id: string;
  creator_email: string;
  prompt: string;
  aspect_ratio: ImageAspectRatio;
  image_url: string;
  created_at: string;
  in_gallery: boolean;
};

function aspectClass(ratio: ImageAspectRatio) {
  if (ratio === "4:5") return "aspect-[4/5]";
  if (ratio === "16:9") return "aspect-[16/10]";
  if (ratio === "9:16") return "aspect-[9/14]";
  return "aspect-square";
}

function ToggleButton({
  generation,
}: {
  generation: AdminGenerationRow;
}) {
  const [pending, startTransition] = useTransition();
  const action = generation.in_gallery ? removeFromGalleryAction : addToGalleryAction;
  const label = generation.in_gallery ? "Gallery-с хасах" : "Gallery-д нэмэх";

  return (
    <form
      action={(fd) => {
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="generation_id" value={generation.id} />
      <button
        type="submit"
        disabled={pending}
        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
          generation.in_gallery
            ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
        }`}
      >
        {pending ? "Хадгалж байна…" : label}
      </button>
    </form>
  );
}

export function AdminGalleryClient({
  generations,
}: {
  generations: AdminGenerationRow[];
}) {
  const inGallery = generations.filter((g) => g.in_gallery);
  const notInGallery = generations.filter((g) => !g.in_gallery);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Gallery удирдлага</h1>
        <p className="mt-1 text-sm text-slate-500">
          Бүх хэрэглэгчдийн зургуудыг доороос харж, gallery-д нэмэх эсвэл хасах боломжтой.
          Зөвхөн admin л энд зураг нэмж, хасч чадна.
        </p>
        <div className="mt-3 flex gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 font-semibold text-cyan-700">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            Gallery-д байгаа: {inGallery.length}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
            Нэмэгдээгүй: {notInGallery.length}
          </span>
        </div>
      </div>

      {/* Not in gallery */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-800">
          Gallery-д ороогүй зургууд ({notInGallery.length})
        </h2>
        {notInGallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Бүх зураг gallery-д орсон байна.
          </div>
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
            {notInGallery.map((gen) => (
              <div key={gen.id} className="mb-4 break-inside-avoid">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className={`overflow-hidden bg-slate-100 ${aspectClass(gen.aspect_ratio)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gen.image_url}
                      alt={gen.prompt}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="truncate text-xs text-slate-500">{gen.creator_email}</p>
                    <p className="line-clamp-2 text-xs text-slate-700">{gen.prompt}</p>
                    <ToggleButton generation={gen} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* In gallery */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-800">
          Gallery-д байгаа зургууд ({inGallery.length})
        </h2>
        {inGallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Одоогоор gallery-д нэмсэн зураг алга байна.
          </div>
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
            {inGallery.map((gen) => (
              <div key={gen.id} className="mb-4 break-inside-avoid">
                <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm ring-1 ring-cyan-100">
                  <div className={`overflow-hidden bg-slate-100 ${aspectClass(gen.aspect_ratio)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gen.image_url}
                      alt={gen.prompt}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="truncate text-xs text-slate-500">{gen.creator_email}</p>
                    <p className="line-clamp-2 text-xs text-slate-700">{gen.prompt}</p>
                    <ToggleButton generation={gen} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
