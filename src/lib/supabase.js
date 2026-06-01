import { createClient } from '@supabase/supabase-js'
import config from '../../config.json'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const isDemoMode = config.demoMode === true
