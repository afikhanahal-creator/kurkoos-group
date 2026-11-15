import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

/* the signed-in user (id, email), read from the session the browser already holds: the app checked it with the auth
   server when it opened, so the screens do not each ask again */
export function useSession() {
  const [u, setU] = useState(null)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setU(data.session?.user || null)) }, [])
  return u
}
