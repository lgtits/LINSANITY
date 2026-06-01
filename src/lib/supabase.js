import { createClient } from '@supabase/supabase-js'
import config from '../../config.json'

export const supabase = createClient(
  config.PROJECT_URL,
  config.ANON_KEY
)

export const isDemoMode = config.demoMode === true
