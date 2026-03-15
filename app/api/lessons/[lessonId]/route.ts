import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LESSON_STORAGE_BUCKET } from "@/lib/lessons";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LessonDownloadRow = {
  id: string;
  file_path: string | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Нэвтэрсний дараа хичээл үзнэ үү." }, { status: 401 });
  }

  const { lessonId } = await context.params;
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id,file_path")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    return Response.json({ error: lessonError.message }, { status: 500 });
  }

  if (!lesson) {
    return Response.json({ error: "Танд энэ хичээлийг үзэх эрх алга эсвэл хичээл олдсонгүй." }, { status: 404 });
  }

  const normalizedLesson = lesson as LessonDownloadRow;

  if (!normalizedLesson.file_path) {
    return Response.json({ error: "Энэ хичээлд файл хавсаргаагүй байна." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data: signedUrlData, error: signedUrlError } = await admin.storage
    .from(LESSON_STORAGE_BUCKET)
    .createSignedUrl(normalizedLesson.file_path, 60 * 5);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return Response.json({ error: "Файл нээх холбоос үүсгэж чадсангүй." }, { status: 500 });
  }

  return Response.redirect(signedUrlData.signedUrl, 302);
}
