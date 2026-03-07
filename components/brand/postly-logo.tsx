import { useId } from "react";

type PostlyLogoProps = {
  compact?: boolean;
  tone?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PostlyLogo({
  compact = false,
  tone = "dark",
  showTagline = false,
  className,
}: PostlyLogoProps) {
  const gradientId = useId();
  const subtitleTone = tone === "dark" ? "text-slate-500" : "text-slate-300";

  return (
    <div className={cx("flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={compact ? "h-10 w-10 shrink-0" : "h-12 w-12 shrink-0"}
      >
        <defs>
          <linearGradient id={gradientId} x1="6" x2="58" y1="8" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8EE8F1" />
            <stop offset="0.56" stopColor="#42C7EA" />
            <stop offset="1" stopColor="#169FD5" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="16" height="56" rx="8" fill={`url(#${gradientId})`} />
        <rect x="4" y="4" width="38" height="16" rx="8" fill={`url(#${gradientId})`} />
        <rect x="4" y="24" width="38" height="16" rx="8" fill={`url(#${gradientId})`} />
        <circle cx="47" cy="32" r="12" fill={`url(#${gradientId})`} />
        <circle cx="47" cy="32" r="7.75" fill={tone === "dark" ? "#081421" : "#f7fcff"} />
        <path d="M44 27.5 51 32l-7 4.5Z" fill={`url(#${gradientId})`} />
      </svg>

      <div className="min-w-0">
        <div
          className={cx(
            "text-brand leading-none font-black tracking-tight",
            compact ? "text-2xl" : "text-[2rem]",
          )}
        >
          Postly
        </div>
        {showTagline ? (
          <div className={cx("mt-1 text-xs font-medium", subtitleTone)}>Контент бүтээх ажлын орчин</div>
        ) : null}
      </div>
    </div>
  );
}
