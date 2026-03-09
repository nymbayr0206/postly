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
  const src = "/postly-logo.png";
  const intrinsic = { width: 1080, height: 413 };
  const sizeClass = showTagline
    ? compact
      ? "w-[134px] sm:w-[148px]"
      : "w-[198px] sm:w-[228px]"
    : compact
      ? "w-[134px] sm:w-[148px]"
      : "w-[220px] sm:w-[254px]";
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
        sizes={compact ? "148px" : "254px"}
        className={cx("h-auto w-full rounded-[1.2rem]", shadowClass)}
      />
    </div>
  );
}
