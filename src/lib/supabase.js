import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('[VRDIKT] VITE_SUPABASE_URL:', supabaseUrl)
console.log('[VRDIKT] VITE_SUPABASE_ANON_KEY (first 20):', supabaseKey?.slice(0, 20))

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    `[VRDIKT] Missing Supabase env vars.\n` +
    `  VITE_SUPABASE_URL:      ${supabaseUrl ?? 'MISSING'}\n` +
    `  VITE_SUPABASE_ANON_KEY: ${supabaseKey ? 'SET' : 'MISSING'}\n` +
    `Make sure .env is in the project root and the dev server was restarted after editing it.`
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
