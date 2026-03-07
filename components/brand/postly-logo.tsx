import Image from "next/image";

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
  const src = showTagline ? "/postly-logo-badge.svg" : "/postly-logo.svg";
  const intrinsic = showTagline ? { width: 520, height: 156 } : { width: 960, height: 260 };
  const sizeClass = showTagline
    ? compact
      ? "w-[160px] sm:w-[172px]"
      : "w-[216px] sm:w-[246px]"
    : compact
      ? "w-[142px] sm:w-[156px]"
      : "w-[248px] sm:w-[288px]";
  const shadowClass =
    tone === "light"
      ? "drop-shadow-[0_0_22px_rgba(91,240,255,0.24)]"
      : "drop-shadow-[0_10px_24px_rgba(20,74,95,0.18)]";

  return (
    <div className={cx("shrink-0", sizeClass, className)}>
      <Image
        src={src}
        alt="Postly.mn"
        width={intrinsic.width}
        height={intrinsic.height}
        priority={showTagline}
        sizes={compact ? "160px" : "280px"}
        className={cx("h-auto w-full", shadowClass)}
      />
    </div>
  );
}
