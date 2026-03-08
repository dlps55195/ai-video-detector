import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeFrame, aggregateResults, type FrameAnalysisResult } from '@/lib/hf-api';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Resolution + bitrate tier classification.
 *
 * Free HF models were trained on web-scraped amateur photos.
 * Professional stock footage is shot at 4K with cinema lenses, shallow DOF,
 * and perfect color grades — characteristics that look identical to AI-generated
 * content to these models.
 *
 * AI video generators (Sora, Runway, HeyGen, Kling, Pika) max out at 1080p
 * as of 2025. Nobody is generating malicious deepfakes at 4K.
 *
 * Tiers:
 *   4K (≥3840px wide)          → heavy dampening, threshold raised to 80%
 *   High-bitrate 1080p (>15Mbps) → moderate dampening, threshold raised to 70%
 *   Standard 1080p/720p         → light dampening, threshold raised to 65%
 *   480p and below              → no dampening, standard 55% threshold
 */
function getResolutionTier(width: number, height: number, bitrateMbps: number): {
  label: string;
  dampenFactor: number;   // multiply each frame score by this (0.0–1.0)
  threshold: number;      // final score must exceed this to be flagged AI
} {
  const maxDim = Math.max(width, height);

  if (maxDim >= 3840) {
    // 4K — very likely professional/stock content
    return { label: '4K', dampenFactor: 0.55, threshold: 80 };
  }

  if (maxDim >= 1920 && bitrateMbps > 15) {
    // High-bitrate 1080p — likely professional camera or stock footage
    return { label: 'hi-bitrate-1080p', dampenFactor: 0.72, threshold: 70 };
  }

  if (maxDim >= 1280) {
    // Standard HD — light dampening for well-shot 720p/1080p
    return { label: 'hd', dampenFactor: 0.88, threshold: 65 };
  }

  // 480p and below — phone footage, screencaps, social media re-uploads
  // These are exactly what deepfake content looks like. No dampening.
  return { label: 'sd', dampenFactor: 1.0, threshold: 55 };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const filename = formData.get('filename') as string;
    const userId = formData.get('userId') as string;
    const frameCount = parseInt((formData.get('frameCount') as string) ?? '0', 10);

    // Video metadata from client (used for resolution dampening)
    const videoWidth = parseInt((formData.get('videoWidth') as string) ?? '0', 10);
    const videoHeight = parseInt((formData.get('videoHeight') as string) ?? '0', 10);
    const videoBitrateMbps = parseFloat((formData.get('videoBitrateMbps') as string) ?? '0');

    if (!filename || !userId || frameCount === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, userId, or frames' },
        { status: 400 }
      );
    }

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

    // Determine resolution tier for dampening
    const resTier = getResolutionTier(videoWidth, videoHeight, videoBitrateMbps);

    // Analyze each frame
    const frameResults: FrameAnalysisResult[] = [];
    for (let i = 0; i < frames.length; i++) {
      const result = await analyzeFrame(frames[i].blob);
      frameResults.push(result);
      if (i < frames.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // Apply resolution dampening to each frame score before aggregation
    const dampenedResults: FrameAnalysisResult[] = frameResults.map((r) => ({
      ...r,
      confidenceScore: Math.round(r.confidenceScore * resTier.dampenFactor),
      isAI: Math.round(r.confidenceScore * resTier.dampenFactor) > resTier.threshold,
    }));

    // Aggregate with dampened scores
    const { isAI, confidenceScore } = aggregateResults(dampenedResults, resTier.threshold);

    // Build per-frame detail — show dampened scores in UI so it's transparent
    const frameDetails = frames.map((f, i) => ({
      timestamp: f.timestamp,
      score: dampenedResults[i]?.confidenceScore ?? 50,
      rawScore: frameResults[i]?.confidenceScore ?? 50, // original pre-dampening score
      label: (dampenedResults[i]?.isAI ?? false) ? 'AI' : 'Real',
    }));

    const analysisDetails = {
      frames_analyzed: frames.length,
      frame_results: frameDetails,
      model_used: 'prithivMLmods/AI-vs-Deepfake-vs-Real-v2.0',
      resolution_tier: resTier.label,
      video_width: videoWidth,
      video_height: videoHeight,
      bitrate_mbps: videoBitrateMbps,
      processing_time_ms: 0, // set on client
      error: frameResults.find((r) => r.error)?.error,
    };

    // Store in Supabase
    const supabase = getSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        video_filename: filename.slice(0, 255),
        is_ai_generated: isAI,
        confidence_score: confidenceScore,
        analysis_details: analysisDetails,
        video_url: null,
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
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