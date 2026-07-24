/* ═══════════════════════════════════════════════════════════
   SUPABASE CLIENT INIT
   Fill these in after creating your project at supabase.com
   (Project Settings → API). The anon key is safe to expose
   publicly — access control is enforced by RLS policies in
   supabase/schema.sql, not by hiding this key.
═══════════════════════════════════════════════════════════ */
const SUPABASE_URL = 'https://btouphdobprvapxfksuq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Yhp9JFUfVZpOjP4Yrj72OA_fehoYNiz';

let supabaseClient = null;
try {
  if (!SUPABASE_URL.startsWith('http')) throw new Error('placeholder URL not replaced');
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn('Supabase is not configured yet — add your project URL and anon key to js/supabase-client.js.', e);
}
