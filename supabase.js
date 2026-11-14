
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://zljjzyvjztrmidqmsald.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5a0ayDYd0Q83Z4rC-X52vA_4XtxNcJx';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
