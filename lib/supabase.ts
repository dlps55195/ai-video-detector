import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types matching the database schema
export interface Analysis {
  id: string;
  user_id: string;
  video_filename: string;
  is_ai_generated: boolean;
  confidence_score: number;
  analysis_details: AnalysisDetails;
  created_at: string;
  video_url: string | null;
}

export interface AnalysisDetails {
  frames_analyzed: number;
  frame_results: FrameResult[];
  model_used: string;
  processing_time_ms: number;
  error?: string;
}

export interface FrameResult {
  timestamp: number;
  score: number;
  label: string;
}