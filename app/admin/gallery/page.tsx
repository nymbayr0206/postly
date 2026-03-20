import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminGalleryClient, type AdminGenerationRow } from "@/components/admin/AdminGalleryClient";
import type { ImageAspectRatio } from "@/lib/types";

type GenerationDbRow = {
  id: string;
  user_id: string;
  prompt: string;
  aspect_ratio: ImageAspectRatio;
  image_url: string;
  created_at: string;
  users: { email: string } | null;
};

type GalleryIdRow = {
  generation_id: string;
};

export default async function AdminGalleryPage() {
  const supabase = await createSupabaseServerClient();

  const [generationsRes, galleryRes] = await Promise.all([
    supabase
      .from("generations")
      .select("id, user_id, prompt, aspect_ratio, image_url, created_at, users(email)")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<GenerationDbRow[]>(),
    supabase
      .from("community_gallery_items")
      .select("generation_id")
      .returns<GalleryIdRow[]>(),
  ]);

  const generations = generationsRes.data ?? [];
  const galleryIds = new Set((galleryRes.data ?? []).map((r) => r.generation_id));

  const rows: AdminGenerationRow[] = generations.map((g) => ({
    id: g.id,
    user_id: g.user_id,
    creator_email: g.users?.email ?? "Үл мэдэгдэх",
    prompt: g.prompt,
    aspect_ratio: g.aspect_ratio,
    image_url: g.image_url,
    created_at: g.created_at,
    in_gallery: galleryIds.has(g.id),
  }));

  return <AdminGalleryClient generations={rows} />;
}
