import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LESSON_STORAGE_BUCKET } from "@/lib/lessons";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function revalidateLessonPaths() {
  revalidatePath("/admin/lessons");
  revalidatePath("/dashboard/lessons");
  revalidatePath("/dashboard");
}

async function requireAdminUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Админ нэвтрэх шаардлагатай." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    return Response.json({ error: "Админы эрх шаардлагатай." }, { status: 403 });
  }

  return user.id;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const adminUserId = await requireAdminUserId();

  if (adminUserId instanceof Response) {
    return adminUserId;
  }

  const { lessonId } = await context.params;
  const admin = createSupabaseAdminClient();

  const { data: lesson, error: lessonError } = await admin
    .from("lessons")
    .select("id,file_path")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    return Response.json({ error: lessonError.message }, { status: 500 });
  }

  if (!lesson) {
    return Response.json({ error: "Хичээл олдсонгүй." }, { status: 404 });
  }

  const { error: deleteError } = await admin.from("lessons").delete().eq("id", lessonId);

  if (deleteError) {
    return Response.json({ error: `Хичээл устгаж чадсангүй: ${deleteError.message}` }, { status: 500 });
  }

  if (lesson.file_path) {
    const { error: storageError } = await admin.storage.from(LESSON_STORAGE_BUCKET).remove([lesson.file_path]);

    if (storageError) {
      console.error("[admin-lessons] storage cleanup error:", storageError);
    }
  }

  revalidateLessonPaths();

  return Response.json({ success: true });
}
