import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import {
  isLessonAudience,
  LESSON_ALLOWED_MIME_TYPES,
  LESSON_MAX_SIZE_BYTES,
  LESSON_STORAGE_BUCKET,
  sanitizeLessonFilename,
} from "@/lib/lessons";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

async function ensureLessonsBucket() {
  const admin = createSupabaseAdminClient();
  const { data: buckets, error } = await admin.storage.listBuckets();

  if (error) {
    throw new Error(error.message);
  }

  const bucketExists = buckets?.some((bucket) => bucket.name === LESSON_STORAGE_BUCKET);

  if (bucketExists) {
    const { error: updateError } = await admin.storage.updateBucket(LESSON_STORAGE_BUCKET, {
      public: false,
      allowedMimeTypes: [...LESSON_ALLOWED_MIME_TYPES],
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    return admin;
  }

  const { error: createError } = await admin.storage.createBucket(LESSON_STORAGE_BUCKET, {
    public: false,
    allowedMimeTypes: [...LESSON_ALLOWED_MIME_TYPES],
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    throw new Error(createError.message);
  }

  return admin;
}

export async function POST(request: Request) {
  const adminUserId = await requireAdminUserId();

  if (adminUserId instanceof Response) {
    return adminUserId;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Формын мэдээлэл буруу байна." }, { status: 400 });
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const audience = String(formData.get("audience") ?? "");
  const file = formData.get("file");

  if (!title) {
    return Response.json({ error: "Хичээлийн гарчиг оруулна уу." }, { status: 400 });
  }

  if (title.length > 120) {
    return Response.json({ error: "Хичээлийн гарчиг хэт урт байна." }, { status: 400 });
  }

  if (description.length > 1000) {
    return Response.json({ error: "Тайлбар хэт урт байна." }, { status: 400 });
  }

  if (!isLessonAudience(audience)) {
    return Response.json({ error: "Хичээлийн ангилал буруу байна." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ error: "Upload хийх файл сонгоно уу." }, { status: 400 });
  }

  if (
    !LESSON_ALLOWED_MIME_TYPES.includes(file.type as (typeof LESSON_ALLOWED_MIME_TYPES)[number])
  ) {
    return Response.json({ error: "Энэ төрлийн файлыг upload хийх боломжгүй." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > LESSON_MAX_SIZE_BYTES) {
    return Response.json({ error: "Файлын хэмжээ зөвшөөрөгдөх хэмжээнээс хэтэрсэн байна." }, { status: 400 });
  }

  let admin;
  try {
    admin = await ensureLessonsBucket();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage бэлтгэж чадсангүй.";
    return Response.json({ error: `Storage бэлтгэхэд алдаа гарлаа: ${message}` }, { status: 500 });
  }
  const filename = sanitizeLessonFilename(file.name);
  const path = `${adminUserId}/${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}-${filename}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(LESSON_STORAGE_BUCKET)
    .upload(path, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: `Файл хадгалж чадсангүй: ${uploadError.message}` }, { status: 500 });
  }

  const { data, error: insertError } = await admin
    .from("lessons")
    .insert({
      title,
      description,
      audience,
      file_name: file.name,
      file_path: path,
      file_size_bytes: file.size,
      content_type: file.type,
      created_by: adminUserId,
    })
    .select("id")
    .single();

  if (insertError) {
    await admin.storage.from(LESSON_STORAGE_BUCKET).remove([path]);
    return Response.json({ error: `Хичээл хадгалж чадсангүй: ${insertError.message}` }, { status: 500 });
  }

  revalidateLessonPaths();

  return Response.json({ success: true, lessonId: data.id });
}
