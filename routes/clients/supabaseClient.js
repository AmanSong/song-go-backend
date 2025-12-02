import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const SUPABASE = createClient(SUPABASE_URL, SERVICE_KEY);

export default SUPABASE;
