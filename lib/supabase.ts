import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

// Configure Supabase to store sessions in cookies so that
// both client components AND server components can read the session.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storage: typeof window !== 'undefined' ? {
      getItem: (key) => {
        // Read from cookie first, fall back to localStorage
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(c => c.trim().startsWith(`${key}=`));
        if (cookie) {
          return decodeURIComponent(cookie.split('=')[1]);
        }
        return localStorage.getItem(key);
      },
      setItem: (key, value) => {
        // Write to BOTH cookie and localStorage
        const maxAge = 60 * 60 * 24 * 7; // 7 days
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        document.cookie = `${key}=; path=/; max-age=0`;
        localStorage.removeItem(key);
      },
    } : undefined,
  },
});