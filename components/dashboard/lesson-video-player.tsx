"use client";

type LessonVideoPlayerProps = {
  lessonId: string;
  title: string;
};

export function LessonVideoPlayer({ lessonId, title }: LessonVideoPlayerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
      <video
        className="aspect-video w-full bg-black"
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="metadata"
        onContextMenu={(event) => event.preventDefault()}
      >
        <source src={`/api/lessons/${lessonId}`} />
        {title}
      </video>
    </div>
  );
}
