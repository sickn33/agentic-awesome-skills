import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Public Supabase credentials for the read-only community save counts feed.
// The browser UI does not perform shared writes; .env values can override these defaults.
const supabaseUrl =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_URL
  || 'https://gczhgcbtjbvfrgfmpbmv.supabase.co'

const supabaseAnonKey =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_CyVwHGbtT80AuDFmXNkc9Q_YNcamTGg'

// Create a single supabase client for interacting with the database
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Type for star data in the database
export interface SkillStarData {
  skill_id: string
  star_count: number
}
