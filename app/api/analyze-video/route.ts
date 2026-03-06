import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeFrame, aggregateResults, type FrameAnalysisResult } from '@/lib/hf-api';

// Use service role key for server-side Supabase (bypasses RLS for insert)
// Falls back to anon key if service key not set
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Pro Vercel, 10s for free

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const filename = formData.get('filename') as string;
    const userId = formData.get('userId') as string;
    const frameCount = parseInt((formData.get('frameCount') as string) ?? '0', 10);

    if (!filename || !userId || frameCount === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, userId, or frames' },
        { status: 400 }
      );
    }

    // Validate userId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    // Extract frame blobs and timestamps
    const frames: { blob: Blob; timestamp: number }[] = [];
    for (let i = 0; i < frameCount; i++) {
      const frameBlob = formData.get(`frame_${i}`) as Blob | null;
      const timestamp = parseFloat((formData.get(`timestamp_${i}`) as string) ?? '0');
      if (frameBlob) {
        frames.push({ blob: frameBlob, timestamp });
      }
    }

    if (frames.length === 0) {
      return NextResponse.json({ error: 'No valid frames received' }, { status: 400 });
    }

    // Analyze each frame
    // Process frames with a small delay between requests to avoid rate limiting
    const frameResults: FrameAnalysisResult[] = [];

    for (let i = 0; i < frames.length; i++) {
      const result = await analyzeFrame(frames[i].blob);
      frameResults.push(result);

      // Small delay between HF requests to reduce rate-limit risk
      if (i < frames.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // Aggregate into final verdict
    const { isAI, confidenceScore } = aggregateResults(frameResults);

    // Build per-frame detail for storage
    const frameDetails = frames.map((f, i) => ({
      timestamp: f.timestamp,
      score: frameResults[i]?.confidenceScore ?? 50,
      label: (frameResults[i]?.isAI ?? false) ? 'AI' : 'Real',
    }));

    const analysisDetails = {
      frames_analyzed: frames.length,
      frame_results: frameDetails,
      model_used: 'dima806/deepfake_vs_real_image_detection',
      processing_time_ms: 0, // Will be set on client
      error: frameResults.find((r) => r.error)?.error,
    };

    // Store in Supabase
    const supabase = getSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        video_filename: filename.slice(0, 255), // Sanitize length
        is_ai_generated: isAI,
        confidence_score: confidenceScore,
        analysis_details: analysisDetails,
        video_url: null,
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      // Still return results even if storage fails
      return NextResponse.json({
        id: 'local-' + Date.now(),
        is_ai_generated: isAI,
        confidence_score: confidenceScore,
        analysis_details: analysisDetails,
        created_at: new Date().toISOString(),
        warning: 'Results could not be saved to database: ' + dbError.message,
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Analysis API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}