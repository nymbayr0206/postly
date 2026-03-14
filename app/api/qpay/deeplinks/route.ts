import { z } from "zod";

import { resolveQPayDeeplinks } from "@/lib/qpay";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  short_url: z.string().trim().min(1, "QPay short url хоосон байна."),
});

export async function HEAD() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON хүсэлтийн бие буруу байна." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Хүсэлтийн мэдээлэл буруу байна." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Нэвтэрнэ үү." }, { status: 401 });
  }

  try {
    const deeplinks = await resolveQPayDeeplinks([], parsed.data.short_url);
    return Response.json({ deeplinks });
  } catch {
    return Response.json({ deeplinks: [] });
  }
}
