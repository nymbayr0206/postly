import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY орчны хувьсагч алга.");
  return key;
}

export function createSupabaseAdminClient() {
  const { supabaseUrl } = getPublicEnv();
  return createClient(supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
