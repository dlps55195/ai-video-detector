import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeFrame, aggregateResults, type FrameAnalysisResult } from '@/lib/hf-api';
import { PLAN_QUOTAS, type PlanKey } from '@/lib/plans';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export const runtime = 'nodejs';
export const maxDuration = 60;

function getResolutionTier(width: number, height: number, bitrateMbps: number): {
  label: string;
  dampenFactor: number;
  threshold: number;
} {
  const maxDim = Math.max(width, height);
  if (maxDim >= 3840) return { label: '4K', dampenFactor: 0.55, threshold: 80 };
  if (maxDim >= 1920 && bitrateMbps > 15) return { label: 'hi-bitrate-1080p', dampenFactor: 0.72, threshold: 70 };
  if (maxDim >= 1280) return { label: 'hd', dampenFactor: 0.88, threshold: 65 };
  return { label: 'sd', dampenFactor: 1.0, threshold: 55 };
}

// ── Quota enforcement ────────────────────────────────────────────────────────
async function checkQuota(supabase: ReturnType<typeof createClient>, userId: string): Promise<{
  allowed: boolean;
  plan: PlanKey;
  monthlyUsed: number;
  dailyUsed: number;
  monthlyLimit: number;
  dailyLimit: number;
  reason?: string;
}> {
  // 1. Look up subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single() as { data: { plan: string | null; status: string | null } | null };

  const rawPlan = (sub?.status === 'active' ? sub?.plan : null) ?? 'free';
  const plan: PlanKey = (['free','plus','pro','unlimited'] as PlanKey[]).includes(rawPlan as PlanKey)
    ? (rawPlan as PlanKey)
    : 'free';

  const quota = PLAN_QUOTAS[plan];

  // 2. Count monthly usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: monthlyUsed } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  // 3. Count daily usage
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count: dailyUsed } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString());

  const monthly = monthlyUsed ?? 0;
  const daily   = dailyUsed   ?? 0;

  if (monthly >= quota.monthly) {
    return {
      allowed: false, plan, monthlyUsed: monthly, dailyUsed: daily,
      monthlyLimit: quota.monthly, dailyLimit: quota.daily,
      reason: `Monthly limit reached (${monthly}/${quota.monthly}). Upgrade your plan to continue.`,
    };
  }

  if (daily >= quota.daily) {
    return {
      allowed: false, plan, monthlyUsed: monthly, dailyUsed: daily,
      monthlyLimit: quota.monthly, dailyLimit: quota.daily,
      reason: `Daily limit reached (${daily}/${quota.daily}). Come back tomorrow or upgrade your plan.`,
    };
  }

  return {
    allowed: true, plan, monthlyUsed: monthly, dailyUsed: daily,
    monthlyLimit: quota.monthly, dailyLimit: quota.daily,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const filename        = formData.get('filename') as string;
    const userId          = formData.get('userId') as string;
    const frameCount      = parseInt((formData.get('frameCount') as string) ?? '0', 10);
    const videoWidth      = parseInt((formData.get('videoWidth') as string) ?? '0', 10);
    const videoHeight     = parseInt((formData.get('videoHeight') as string) ?? '0', 10);
    const videoBitrateMbps = parseFloat((formData.get('videoBitrateMbps') as string) ?? '0');

    if (!filename || !userId || frameCount === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // ── Enforce quota ──────────────────────────────────────────────────────
    const quota = await checkQuota(supabase, userId);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason, code: 'QUOTA_EXCEEDED', quota },
        { status: 429 }
      );
    }

    // Extract frames
    const frames: { blob: Blob; timestamp: number }[] = [];
    for (let i = 0; i < frameCount; i++) {
      const frameBlob = formData.get(`frame_${i}`) as Blob | null;
      const timestamp = parseFloat((formData.get(`timestamp_${i}`) as string) ?? '0');
      if (frameBlob) frames.push({ blob: frameBlob, timestamp });
    }

    if (frames.length === 0) {
      return NextResponse.json({ error: 'No valid frames received' }, { status: 400 });
    }

    const resTier = getResolutionTier(videoWidth, videoHeight, videoBitrateMbps);

    // Analyze frames
    const frameResults: FrameAnalysisResult[] = [];
    for (let i = 0; i < frames.length; i++) {
      const result = await analyzeFrame(frames[i].blob);
      frameResults.push(result);
      if (i < frames.length - 1) await new Promise((r) => setTimeout(r, 300));
    }

    const dampenedResults: FrameAnalysisResult[] = frameResults.map((r) => ({
      ...r,
      confidenceScore: Math.round(r.confidenceScore * resTier.dampenFactor),
      isAI: Math.round(r.confidenceScore * resTier.dampenFactor) > resTier.threshold,
    }));

    const { isAI, confidenceScore } = aggregateResults(dampenedResults, resTier.threshold);

    const frameDetails = frames.map((f, i) => ({
      timestamp: f.timestamp,
      score: dampenedResults[i]?.confidenceScore ?? 50,
      rawScore: frameResults[i]?.confidenceScore ?? 50,
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
      processing_time_ms: 0,
      error: frameResults.find((r) => r.error)?.error,
      plan: quota.plan, // store plan at time of analysis
    };

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
        warning: 'Results could not be saved: ' + dbError.message,
      });
    }

    // Return result + quota info so client can show usage
    return NextResponse.json({
      ...data,
      quota: {
        plan: quota.plan,
        monthlyUsed: quota.monthlyUsed + 1,
        monthlyLimit: quota.monthlyLimit,
        dailyUsed: quota.dailyUsed + 1,
        dailyLimit: quota.dailyLimit,
      },
    });
  } catch (err) {
    console.error('Analysis API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
