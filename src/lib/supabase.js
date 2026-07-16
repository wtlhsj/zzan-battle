import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://idtrfnvlejqsnstvschn.supabase.co'
const SUPABASE_KEY = 'sb_publishable_W-d_ZO8BumRf9NDkRDBFEw_I6QklnXy'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const VOTER_KEY_STORAGE = 'zzan_voter_key'

export function getVoterKey() {
  let key = localStorage.getItem(VOTER_KEY_STORAGE)
  if (!key) {
    key = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
    localStorage.setItem(VOTER_KEY_STORAGE, key)
  }
  return key
}
