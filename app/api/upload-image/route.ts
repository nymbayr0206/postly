import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "uploads";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: Request) {
  // Auth check
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Please sign in to upload images." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Only JPG, PNG, and WebP images are allowed." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Response.json({ error: "File exceeds 10MB limit." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const admin = createSupabaseAdminClient();

  // Ensure bucket exists and is public
  const { data: buckets } = await admin.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);

  if (!bucketExists) {
    const { error: createError } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_TYPES,
    });
    if (createError) {
      console.error("[upload-image] bucket create error:", createError);
      return Response.json({ error: "Storage not available." }, { status: 500 });
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[upload-image] upload error:", uploadError);
    return Response.json({ error: "Failed to upload image." }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);

  return Response.json({ url: urlData.publicUrl });
}
