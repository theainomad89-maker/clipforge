import { createClient } from '@supabase/supabase-js';

// Admin client for server code (uses SERVICE ROLE KEY) – do NOT import this in client components
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,                 // <-- non-public URL
  process.env.SUPABASE_SERVICE_ROLE_KEY!,    // <-- service role key
  { auth: { persistSession: false } }
);

// Public client (only if you need it in client components later)
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
