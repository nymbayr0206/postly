import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (client) {
    return client;
  }

  const { supabaseAnonKey, supabaseUrl } = getPublicEnv();

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);

  return client;
}

