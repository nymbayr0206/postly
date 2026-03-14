import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GenerationRow, UserRole } from "@/lib/types";

export type CommunityGeneration = GenerationRow & {
  created_at_label: string;
  creator_email: string | null;
  creator_role: UserRole | null;
  prompt_excerpt: string;
};

const GENERATION_SELECT = "id,user_id,model_name,prompt,aspect_ratio,cost,image_url,created_at";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function summarizePrompt(prompt: string, maxLength = 140) {
  const normalized = prompt.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

async function getCreatorMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { email: string | null; role: UserRole | null }>();
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id,email,role")
      .in("id", userIds);

    if (error || !data) {
      return new Map<string, { email: string | null; role: UserRole | null }>();
    }

    return new Map(
      data.map((user) => [
        user.id as string,
        {
          email: typeof user.email === "string" ? user.email : null,
          role: (user.role as UserRole | null) ?? null,
        },
      ]),
    );
  } catch {
    return new Map<string, { email: string | null; role: UserRole | null }>();
  }
}

async function withCreators(generations: GenerationRow[]) {
  const creatorMap = await getCreatorMap([...new Set(generations.map((item) => item.user_id))]);

  return generations.map((generation) => {
    const creator = creatorMap.get(generation.user_id);

    return {
      ...generation,
      created_at_label: formatDate(generation.created_at),
      creator_email: creator?.email ?? null,
      creator_role: creator?.role ?? null,
      prompt_excerpt: summarizePrompt(generation.prompt),
    } satisfies CommunityGeneration;
  });
}

export async function listCommunityGenerations(limit = 24) {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("generations")
      .select(GENERATION_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<GenerationRow[]>();

    if (error || !data) {
      return [] as CommunityGeneration[];
    }

    return withCreators(data);
  } catch {
    return [] as CommunityGeneration[];
  }
}

export async function getCommunityGenerationById(id: string) {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("generations")
      .select(GENERATION_SELECT)
      .eq("id", id)
      .single<GenerationRow>();

    if (error || !data) {
      return null;
    }

    const [generation] = await withCreators([data]);
    return generation ?? null;
  } catch {
    return null;
  }
}

export async function listRelatedCommunityGenerations(excludeId: string, limit = 8) {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("generations")
      .select(GENERATION_SELECT)
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<GenerationRow[]>();

    if (error || !data) {
      return [] as CommunityGeneration[];
    }

    return withCreators(data);
  } catch {
    return [] as CommunityGeneration[];
  }
}
