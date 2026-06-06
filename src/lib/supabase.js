import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/* לקוח Supabase יחיד. אם חסרים משתני סביבה — נשאר null והאתר
   נופל בחן חזרה לנתונים המקומיים (לא קורס). */
export const supabase = url && anon ? createClient(url, anon) : null
export const hasSupabase = !!supabase
