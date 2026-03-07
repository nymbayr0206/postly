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
  const glowGradientId = useId();
  const filterId = useId();
  const iconSize = compact ? "h-10 w-10" : "h-12 w-12";
  const subtitleTone = tone === "dark" ? "text-slate-500" : "text-cyan-100/85";
  const wordmarkTone =
    tone === "light"
      ? "bg-[linear-gradient(135deg,#f2ffff_0%,#9bf5ff_28%,#4cd7f2_62%,#0ea5e9_100%)] drop-shadow-[0_0_18px_rgba(110,241,255,0.42)]"
      : "bg-[linear-gradient(135deg,#7fe7f2_0%,#2dbce7_48%,#0b91df_100%)]";

  return (
    <div className={cx("flex items-center gap-3", className)}>
      <svg viewBox="0 0 64 64" aria-hidden="true" className={cx("shrink-0", iconSize)}>
        <defs>
          <linearGradient id={gradientId} x1="8" x2="56" y1="10" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B4FBFF" />
            <stop offset="0.45" stopColor="#54DDF0" />
            <stop offset="1" stopColor="#0A98E8" />
          </linearGradient>
          <radialGradient id={glowGradientId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(34 30) rotate(90) scale(28)">
            <stop stopColor="#88F7FF" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#2AD5F6" stopOpacity="0.44" />
            <stop offset="1" stopColor="#2AD5F6" stopOpacity="0" />
          </radialGradient>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={tone === "light" ? "3.5" : "1.75"} />
          </filter>
        </defs>

        {tone === "light" ? <circle cx="34" cy="31" r="24" fill={`url(#${glowGradientId})`} filter={`url(#${filterId})`} /> : null}

        <g fill={`url(#${gradientId})`}>
          <rect x="4" y="4" width="16" height="56" rx="8" />
          <rect x="4" y="4" width="38" height="16" rx="8" />
          <rect x="4" y="24" width="38" height="16" rx="8" />
          <circle cx="47" cy="32" r="12" />
        </g>

        <circle cx="47" cy="32" r="7.75" fill={tone === "light" ? "#082236" : "#F6FCFF"} />
        <path d="M44 27.5 51.2 32 44 36.5Z" fill={`url(#${gradientId})`} />
      </svg>

      <div className="min-w-0">
        <div
          className={cx(
            "bg-clip-text text-transparent leading-none font-black tracking-[-0.06em]",
            compact ? "text-[1.8rem]" : "text-[2.3rem]",
            wordmarkTone,
          )}
        >
          <span>Postly</span>
          <span className="ml-0.5 text-[0.78em] tracking-[-0.04em]">.mn</span>
        </div>
        {showTagline ? (
          <div className={cx("mt-1 text-xs font-medium", subtitleTone)}>Контент бүтээх ажлын орчин</div>
        ) : null}
      </div>
    </div>
  );
}
