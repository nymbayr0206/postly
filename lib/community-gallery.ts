import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ImageAspectRatio, UserRole } from "@/lib/types";

export type CommunityGeneration = {
  id: string;
  user_id: string;
  creator_email: string | null;
  creator_role: UserRole | null;
  prompt: string;
  aspect_ratio: ImageAspectRatio;
  cost: number;
  image_url: string;
  created_at: string;
  created_at_label: string;
};

type CommunityGalleryRow = {
  generation_id: string;
  user_id: string;
  creator_email: string;
  creator_role: UserRole;
  prompt: string;
  aspect_ratio: ImageAspectRatio;
  cost: number;
  image_url: string;
  created_at: string;
};

const COMMUNITY_GALLERY_SELECT = [
  "generation_id",
  "user_id",
  "creator_email",
  "creator_role",
  "prompt",
  "aspect_ratio",
  "cost",
  "image_url",
  "created_at",
].join(",");

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function hydrateCommunityGeneration(row: CommunityGalleryRow): CommunityGeneration {
  return {
    id: row.generation_id,
    user_id: row.user_id,
    creator_email: row.creator_email ?? null,
    creator_role: row.creator_role ?? null,
    prompt: row.prompt,
    aspect_ratio: row.aspect_ratio,
    cost: row.cost,
    image_url: row.image_url,
    created_at: row.created_at,
    created_at_label: formatDate(row.created_at),
  };
}

export async function listCommunityGenerations(limit = 24) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("community_gallery_items")
    .select(COMMUNITY_GALLERY_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CommunityGalleryRow[]>();

  if (error || !data) {
    return [] as CommunityGeneration[];
  }

  return data.map(hydrateCommunityGeneration);
}

export async function getCommunityGenerationById(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("community_gallery_items")
    .select(COMMUNITY_GALLERY_SELECT)
    .eq("generation_id", id)
    .maybeSingle<CommunityGalleryRow>();

  if (error || !data) {
    return null;
  }

  return hydrateCommunityGeneration(data);
}

export async function listRelatedCommunityGenerations(excludeId: string, limit = 8) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("community_gallery_items")
    .select(COMMUNITY_GALLERY_SELECT)
    .neq("generation_id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CommunityGalleryRow[]>();

  if (error || !data) {
    return [] as CommunityGeneration[];
  }

  return data.map(hydrateCommunityGeneration);
}
