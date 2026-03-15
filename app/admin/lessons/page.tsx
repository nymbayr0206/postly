import { AdminLessonsClient } from "@/components/admin/AdminLessonsClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonRow } from "@/lib/types";

function normalizeLessons(rows: LessonRow[]) {
  return rows.map((lesson) => ({
    ...lesson,
    file_size_bytes:
      lesson.file_size_bytes === null || lesson.file_size_bytes === undefined
        ? null
        : Number(lesson.file_size_bytes),
  }));
}

export default async function AdminLessonsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("id,title,description,audience,file_name,file_path,file_size_bytes,content_type,created_by,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Хичээлийн жагсаалт ачаалж чадсангүй.");
  }

  return <AdminLessonsClient lessons={normalizeLessons((data ?? []) as LessonRow[])} />;
}
