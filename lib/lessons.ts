import type { LessonAudience, UserRole } from "@/lib/types";

export const LESSON_STORAGE_BUCKET = "lessons";
export const LESSON_MAX_SIZE_BYTES = 3 * 1024 * 1024 * 1024;
export const LESSON_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.ms-excel",
  "text/plain",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const LESSON_AUDIENCE_OPTIONS: Array<{
  value: LessonAudience;
  label: string;
  description: string;
}> = [
  {
    value: "user",
    label: "Энгийн хэрэглэгч",
    description: "Зөвхөн энгийн хэрэглэгчийн хичээл дээр харагдана.",
  },
  {
    value: "agent",
    label: "Агент",
    description: "Зөвхөн агент хэрэглэгчдийн хичээл дээр харагдана.",
  },
  {
    value: "all",
    label: "Бүх хэрэглэгч",
    description: "Энгийн хэрэглэгч болон агент хоёрт хоёуланд нь харагдана.",
  },
] as const;

export function isLessonAudience(value: string): value is LessonAudience {
  return value === "user" || value === "agent" || value === "all";
}

export function getLessonAudienceLabel(audience: LessonAudience) {
  if (audience === "agent") {
    return "Агент";
  }

  if (audience === "all") {
    return "Бүх хэрэглэгч";
  }

  return "Энгийн хэрэглэгч";
}

export function getVisibleLessonAudiences(role: UserRole): LessonAudience[] {
  if (role === "admin") {
    return ["user", "agent", "all"];
  }

  if (role === "agent") {
    return ["agent", "all"];
  }

  return ["user", "all"];
}

export function canAccessLesson(role: UserRole, audience: LessonAudience) {
  return getVisibleLessonAudiences(role).includes(audience);
}

export function formatLessonFileSize(value: number | null) {
  if (!value || value <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const decimals = unitIndex === 0 ? 0 : size >= 10 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

export function getLessonContentTypeLabel(contentType: string | null) {
  if (!contentType) {
    return "Файл";
  }

  if (contentType.startsWith("video/")) {
    return "Видео";
  }

  if (contentType === "application/pdf") {
    return "PDF";
  }

  if (contentType.includes("presentation")) {
    return "Presentation";
  }

  if (contentType.includes("word") || contentType.includes("document")) {
    return "Document";
  }

  if (contentType.includes("sheet") || contentType.includes("excel")) {
    return "Spreadsheet";
  }

  if (contentType === "text/plain") {
    return "Text";
  }

  return "Файл";
}

export function sanitizeLessonFilename(filename: string) {
  const trimmed = filename.trim();
  const normalized = trimmed
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "lesson-file";
}
