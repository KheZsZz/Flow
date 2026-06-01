import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

const envFile =
  process.env.AMBIENT_PERFIL_ENV === "production" ? ".env" : ".env";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const supabaseUrl = process.env.FLOW_SUPBASE_URL!;
const supabaseAnonKey = process.env.FLOW_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.FLOW_SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
