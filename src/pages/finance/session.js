import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

/* the signed-in user (id, email) */
export function useSession() {
  const [u, setU] = useState(null)
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setU(data.user || null)) }, [])
  return u
}
