import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canAccessLesson,
  LESSON_STORAGE_BUCKET,
  sanitizeLessonFilename,
} from "@/lib/lessons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonAudience, UserRole } from "@/lib/types";

type LessonStreamRow = {
  id: string;
  audience: LessonAudience;
  content_type: string | null;
  file_name: string | null;
  file_path: string | null;
  title: string;
};

function getExtensionFromContentType(contentType: string | null) {
  switch (contentType) {
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    case "application/pdf":
      return "pdf";
    case "text/plain":
      return "txt";
    default:
      return null;
  }
}

function buildInlineFilename(lesson: LessonStreamRow) {
  const baseName = sanitizeLessonFilename(lesson.file_name ?? lesson.title ?? "lesson-file");

  if (baseName.includes(".")) {
    return baseName;
  }

  const extension = getExtensionFromContentType(lesson.content_type);
  return extension ? `${baseName}.${extension}` : baseName;
}

async function resolveLessonAccess(context: { params: Promise<{ lessonId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      errorResponse: Response.json({ error: "Нэвтэрсний дараа хичээл үзнэ үү." }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: UserRole }>();

  if (profileError) {
    return {
      errorResponse: Response.json({ error: profileError.message }, { status: 500 }),
    };
  }

  if (!profile) {
    return {
      errorResponse: Response.json({ error: "Хэрэглэгчийн профайл олдсонгүй." }, { status: 403 }),
    };
  }

  const { lessonId } = await context.params;
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id,title,audience,content_type,file_name,file_path")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    return {
      errorResponse: Response.json({ error: lessonError.message }, { status: 500 }),
    };
  }

  if (!lesson) {
    return {
      errorResponse: Response.json(
        { error: "Танд энэ хичээлийг үзэх эрх алга эсвэл хичээл олдсонгүй." },
        { status: 404 },
      ),
    };
  }

  const normalizedLesson = lesson as LessonStreamRow;

  if (!canAccessLesson(profile.role, normalizedLesson.audience)) {
    return {
      errorResponse: Response.json({ error: "Танд энэ хичээлийг үзэх эрх алга." }, { status: 403 }),
    };
  }

  if (!normalizedLesson.file_path) {
    return {
      errorResponse: Response.json({ error: "Энэ хичээлд файл хавсаргаагүй байна." }, { status: 404 }),
    };
  }

  return { lesson: normalizedLesson };
}

async function proxyLessonStream(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
  method: "GET" | "HEAD",
) {
  const access = await resolveLessonAccess(context);

  if ("errorResponse" in access) {
    return access.errorResponse;
  }

  const { lesson } = access;
  const lessonPath = lesson.file_path;

  if (!lessonPath) {
    return Response.json({ error: "Энэ хичээлд файл хавсаргаагүй байна." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data: signedUrlData, error: signedUrlError } = await admin.storage
    .from(LESSON_STORAGE_BUCKET)
    .createSignedUrl(lessonPath, 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return Response.json({ error: "Файл нээх холбоос үүсгэж чадсангүй." }, { status: 500 });
  }

  const upstreamHeaders = new Headers();
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    upstreamHeaders.set("range", rangeHeader);
  }

  const upstreamResponse = await fetch(signedUrlData.signedUrl, {
    method,
    headers: upstreamHeaders,
  });

  if (!upstreamResponse.ok) {
    return Response.json({ error: "Хичээлийн файлыг урсгалаар авч чадсангүй." }, { status: 502 });
  }

  const responseHeaders = new Headers();

  for (const headerName of [
    "accept-ranges",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ]) {
    const headerValue = upstreamResponse.headers.get(headerName);

    if (headerValue) {
      responseHeaders.set(headerName, headerValue);
    }
  }

  responseHeaders.set("Cache-Control", "private, no-store, max-age=0");
  responseHeaders.set("Content-Disposition", `inline; filename="${buildInlineFilename(lesson)}"`);
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(method === "HEAD" ? null : upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  return proxyLessonStream(request, context, "GET");
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  return proxyLessonStream(request, context, "HEAD");
}
