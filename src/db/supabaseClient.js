// Supabase client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://txrjfjsnfchcwzyfenld.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MTZzNvPgseSFmSEW7_1YHw_wsJO-H1C';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
