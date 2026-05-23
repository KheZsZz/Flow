
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

const envFile =
  process.env.AMBIENT_PERFIL_ENV === "production" ? ".env" : ".env.development";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const supabaseUrl = process.env.FLOW_SUPBASE_URL!;
const supabaseAnonKey = process.env.FLOW_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.FLOW_SUPABASE_SERVICE_KEY!; 


// console.log("supabaseUrl:", supabaseUrl ?? "UNDEFINED");
// console.log("supabaseAnonKey:", supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + "..." : "UNDEFINED");
// console.log("supabaseServiceKey:", supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + "..." : "UNDEFINED");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);