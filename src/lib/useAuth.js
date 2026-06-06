import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/* session: undefined = טוען · null = לא מחובר · object = מחובר */
export function useAuth() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    if (!supabase) { setSession(null); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  return session
}
