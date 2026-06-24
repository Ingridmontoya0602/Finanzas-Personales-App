import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfmwzfuaimkrzkvftatw.supabase.co'
const supabaseKey = 'sb_publishable_NySJLvNtvthspMIoMnS68Q_u1eaVp9x'

export const supabase = createClient(supabaseUrl, supabaseKey)