import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/download?url=<encoded_url>
 *
 * Server-side proxy: гадны URL-ийн файлыг серверээс татаж,
 * Content-Disposition: attachment header-тэй клиент рүү дамжуулна.
 * Ингэснээр iOS Safari-ийн CORS хязгаарлалтыг давна.
 */
export async function GET(request: NextRequest) {
  // Auth шалгах — зөвхөн нэвтэрсэн хэрэглэгч татаж чадна
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get("url");

  if (!fileUrl) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // URL validate хийх
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  // Зөвхөн https-г зөвшөөрнө
  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Only https URLs allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(fileUrl, {
      // Server-side fetch — CORS хязгаарлалт байхгүй
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = upstream.body;

    if (!body) {
      return NextResponse.json({ error: "Empty response from upstream" }, { status: 502 });
    }

    // Filename-г URL-аас гаргана
    const pathname = parsedUrl.pathname;
    const filename = pathname.split("/").pop() ?? "download";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Cache хийхгүй
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[download proxy] error:", err);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
