import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

export function createSupabaseAdminClient() {
  const { supabaseUrl } = getPublicEnv();
  return createClient(supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
