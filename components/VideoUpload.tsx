'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, type Analysis } from '@/lib/supabase';
import {
  validateVideoFile,
  extractFrames,
  getVideoMetadata,
  formatFileSize,
  type ExtractionProgress,
} from '@/lib/video-processing';
import ResultsDisplay from './ResultsDisplay';

type Stage =
  | 'idle'
  | 'selected'
  | 'extracting'
  | 'analyzing'
  | 'storing'
  | 'done'
  | 'error';

interface ProgressState {
  stage: Stage;
  message: string;
  framesTotal: number;
  framesDone: number;
}

// ── Scan-line overlay rendered during analysis ─────────────────────────────
function ScanningOverlay({ stage, framesDone, framesTotal }: {
  stage: Stage;
  framesDone: number;
  framesTotal: number;
}) {
  const [scanPos, setScanPos] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setScanPos(p => (p >= 100 ? 0 : p + 0.7));
      setTick(t => t + 1);
    }, 16);
    return () => clearInterval(id);
  }, []);

  const stageLabel =
    stage === 'extracting' ? 'EXTRACTING FRAMES' :
    stage === 'analyzing'  ? 'NEURAL ANALYSIS' :
    'SAVING RESULTS';

  const progressPct = framesTotal > 0 ? Math.round((framesDone / framesTotal) * 100) : Math.min(tick % 101, 99);

  return (
    <>
      <style>{`
        @keyframes corner-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        .vf-corner { animation: corner-pulse 1.4s ease-in-out infinite; }
        .vf-blink  { animation: blink 1s step-end infinite; }
      `}</style>

      {/* Scrim */}
      <div className="absolute inset-0 bg-black/55" />

      {/* CRT scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.2) 2px,rgba(0,0,0,0.2) 4px)',
      }} />

      {/* Moving scan line */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{
        top: `${scanPos}%`,
        height: '3px',
        background: 'linear-gradient(to right,transparent 0%,#22d3ee 20%,#a5f3fc 50%,#22d3ee 80%,transparent 100%)',
        boxShadow: '0 0 14px 5px rgba(34,211,238,0.35)',
      }} />

      {/* Corner brackets — TL */}
      <div className="vf-corner absolute top-3 left-3 w-8 h-8 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400" />
        <div className="absolute top-0 left-0 w-[2px] h-full bg-cyan-400" />
      </div>
      {/* TR */}
      <div className="vf-corner absolute top-3 right-3 w-8 h-8 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-[2px] bg-cyan-400" />
        <div className="absolute top-0 right-0 w-[2px] h-full bg-cyan-400" />
      </div>
      {/* BL */}
      <div className="vf-corner absolute bottom-14 left-3 w-8 h-8 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400" />
        <div className="absolute bottom-0 left-0 w-[2px] h-full bg-cyan-400" />
      </div>
      {/* BR */}
      <div className="vf-corner absolute bottom-14 right-3 w-8 h-8 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-full h-[2px] bg-cyan-400" />
        <div className="absolute bottom-0 right-0 w-[2px] h-full bg-cyan-400" />
      </div>

      {/* Center crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-12 h-12 opacity-70">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-cyan-400 rounded-full" />
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/75 border-t border-cyan-900/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest">{stageLabel}</span>
          <span className="vf-blink font-mono text-[10px] text-cyan-400">▌</span>
        </div>
        <div className="flex items-center gap-3">
          {framesTotal > 0 && (
            <span className="font-mono text-[10px] text-slate-500">
              {framesDone}/{framesTotal} frames
            </span>
          )}
          <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="font-mono text-[10px] text-cyan-400 w-7 text-right">{progressPct}%</span>
        </div>
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function VideoUpload({ userId, plan = "free", initialQuota }: {
  userId: string;
  plan?: string;
  initialQuota?: { monthlyUsed: number; dailyUsed: number };
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    message: '',
    framesTotal: 0,
    framesDone: 0,
  });
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adminSecret, setAdminSecret] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // ── Quota state ─────────────────────────────────────────────────────────
  const PLAN_LIMITS: Record<string, { monthly: number; daily: number }> = {
    free:      { monthly: 3,    daily: 3    },
    plus:      { monthly: 50,   daily: 5    },
    pro:       { monthly: 150,  daily: 15   },
    unlimited: { monthly: 1000, daily: 50   },
  };
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const [quota, setQuota] = useState({
    monthlyUsed: initialQuota?.monthlyUsed ?? 0,
    dailyUsed:   initialQuota?.dailyUsed   ?? 0,
  });
  const [quotaExceeded, setQuotaExceeded] = useState<{ reason: string } | null>(null);

  const resetState = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setQuotaExceeded(null);
    setProgress({ stage: 'idle', message: '', framesTotal: 0, framesDone: 0 });
  };

  const handleFile = useCallback((selected: File) => {
    const validation = validateVideoFile(selected);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid file');
      return;
    }
    setError(null);
    setResult(null);
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
    setProgress({ stage: 'selected', message: '', framesTotal: 0, framesDone: 0 });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    const startTime = Date.now();

    try {
      setProgress({ stage: 'extracting', message: 'Extracting frames...', framesTotal: 8, framesDone: 0 });

      const [frames, videoMeta] = await Promise.all([
        extractFrames(file, 2, 8, (p: ExtractionProgress) => {
          setProgress({
            stage: 'extracting',
            message: `Extracting frame ${p.current}/${p.total}`,
            framesTotal: p.total,
            framesDone: p.current,
          });
        }),
        getVideoMetadata(file),
      ]);

      if (frames.length === 0) {
        throw new Error('Could not extract frames from video. Try a different format.');
      }

      setProgress({ stage: 'analyzing', message: `Analyzing ${frames.length} frames...`, framesTotal: frames.length, framesDone: 0 });

      const formData = new FormData();
      formData.append('filename', file.name);
      formData.append('userId', userId);
      frames.forEach((frame, i) => {
        formData.append(`frame_${i}`, frame.blob, `frame_${i}.jpg`);
        formData.append(`timestamp_${i}`, frame.timestamp.toString());
      });
      formData.append('frameCount', frames.length.toString());
      formData.append('videoWidth', videoMeta.width.toString());
      formData.append('videoHeight', videoMeta.height.toString());
      formData.append('videoBitrateMbps', videoMeta.bitrateMbps.toFixed(2));
      if (adminSecret) formData.append('adminSecret', adminSecret);

      const response = await fetch('/api/analyze-video', { method: 'POST', body: formData });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Analysis failed' }));
        if (response.status === 429 && errData.code === 'QUOTA_EXCEEDED') {
          setQuotaExceeded({ reason: errData.error ?? 'Limit reached' });
          setProgress({ stage: 'error', message: '', framesTotal: 0, framesDone: 0 });
          return;
        }
        throw new Error(errData.error ?? `Server error ${response.status}`);
      }

      const analysisData = await response.json();

      setProgress({ stage: 'storing', message: 'Saving results...', framesTotal: frames.length, framesDone: frames.length });

      const processingTime = Date.now() - startTime;
      const analysisRecord: Analysis = {
        id: analysisData.id,
        user_id: userId,
        video_filename: file.name,
        is_ai_generated: analysisData.is_ai_generated,
        confidence_score: analysisData.confidence_score,
        analysis_details: { ...analysisData.analysis_details, processing_time_ms: processingTime },
        created_at: analysisData.created_at ?? new Date().toISOString(),
        video_url: null,
      };

      // Update local quota counts from API response
      if (analysisData.quota) {
        setQuota({ monthlyUsed: analysisData.quota.monthlyUsed, dailyUsed: analysisData.quota.dailyUsed });
      } else {
        setQuota(q => ({ monthlyUsed: q.monthlyUsed + 1, dailyUsed: q.dailyUsed + 1 }));
      }
      setResult(analysisRecord);
      setProgress({ stage: 'done', message: 'Analysis complete', framesTotal: frames.length, framesDone: frames.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setError(message);
      setProgress({ stage: 'error', message, framesTotal: 0, framesDone: 0 });
    }
  };

  const isProcessing = ['extracting', 'analyzing', 'storing'].includes(progress.stage);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">

      {/* ── Quota exceeded modal ── */}
      {quotaExceeded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface border border-signal-fake/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-signal-fake/10 border border-signal-fake/30 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-100 text-base">Detection limit reached</h3>
                <p className="font-mono text-xs text-slate-500 capitalize">{plan} plan</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">{quotaExceeded.reason}</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setQuotaExceeded(null)}
                className="flex-1 py-2.5 border border-border text-slate-400 font-display text-sm rounded-lg hover:border-slate-500 transition-colors"
              >
                Dismiss
              </button>
              <a
                href="/pricing"
                className="flex-1 py-2.5 bg-amber-glow text-void font-display font-bold text-sm rounded-lg hover:bg-amber-400 transition-colors text-center"
              >
                Upgrade Plan →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Usage indicator ── */}
      <div className="border border-border bg-surface rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">Monthly usage</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-slate-400">
              {quota.monthlyUsed} / {limits.monthly}
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-slate-500 uppercase">{plan}</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-panel rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((quota.monthlyUsed / limits.monthly) * 100, 100)}%`,
              background: quota.monthlyUsed >= limits.monthly
                ? '#ef4444'
                : quota.monthlyUsed / limits.monthly > 0.8
                ? '#f59e0b'
                : '#22c55e',
            }}
          />
        </div>
        {quota.dailyUsed >= limits.daily && (
          <p className="font-mono text-[10px] text-signal-fake">
            Daily limit reached ({limits.daily}/day) · resets at midnight
          </p>
        )}
        {plan === 'free' && quota.monthlyUsed >= limits.monthly * 0.67 && quota.monthlyUsed < limits.monthly && (
          <p className="font-mono text-[10px] text-amber-glow">
            {limits.monthly - quota.monthlyUsed} detection{limits.monthly - quota.monthlyUsed !== 1 ? 's' : ''} left this month ·{' '}
            <a href="/pricing" className="underline hover:text-amber-400">Upgrade</a>
          </p>
        )}
      </div>

      {/* Drop zone — idle only */}
      {progress.stage === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
            ${dragging ? 'border-amber-glow bg-amber-glow/5 scale-[1.01]' : 'border-border hover:border-amber-glow/40 hover:bg-panel/30'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/avi,.mp4,.webm,.mov,.avi"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border border-border bg-panel flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5">
                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-display font-semibold text-slate-200 mb-1">Drop your video here</p>
              <p className="text-slate-500 text-sm">or click to browse · MP4, WebM, MOV, AVI · max 100MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Video preview — persists through selected + processing */}
      {file && progress.stage !== 'done' && previewUrl && (
        <div className="border border-border bg-surface rounded-xl overflow-hidden">
          <div className="relative bg-void aspect-video">
            <video
              src={previewUrl}
              className="w-full h-full object-contain"
              preload="auto"
              muted
              playsInline
              controls={progress.stage === 'selected'}
            />
            {isProcessing && (
              <ScanningOverlay
                stage={progress.stage}
                framesDone={progress.framesDone}
                framesTotal={progress.framesTotal}
              />
            )}
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-panel border border-border flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                  <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-mono text-xs text-slate-300 truncate max-w-[240px]">{file.name}</p>
                <p className="font-mono text-[10px] text-slate-600">{formatFileSize(file.size)}</p>
              </div>
            </div>
            {!isProcessing && (
              <button onClick={resetState} className="font-mono text-xs text-slate-600 hover:text-signal-fake transition-colors">
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 border border-signal-fake/30 bg-signal-fake/5 rounded-xl space-y-2">
          <p className="font-mono text-sm text-signal-fake">{error}</p>
          <button onClick={resetState} className="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Start over
          </button>
        </div>
      )}

      {/* Admin dev bypass */}
      {!adminUnlocked ? (
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Dev password (optional)"
            value={adminSecret}
            onChange={e => setAdminSecret(e.target.value)}
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg font-mono text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:border-amber-glow/40"
          />
          {adminSecret && (
            <button
              onClick={() => setAdminUnlocked(true)}
              className="px-4 py-2 border border-amber-glow/40 text-amber-glow font-mono text-xs rounded-lg hover:bg-amber-glow/10 transition-colors"
            >
              Unlock
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-glow/10 border border-amber-glow/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-glow animate-pulse" />
            <span className="font-mono text-xs text-amber-glow">DEV MODE — rate limits bypassed</span>
          </div>
          <button
            onClick={() => { setAdminUnlocked(false); setAdminSecret(''); }}
            className="font-mono text-xs text-slate-600 hover:text-signal-fake transition-colors"
          >
            Lock
          </button>
        </div>
      )}

      {/* Analyze button */}
      {file && progress.stage === 'selected' && (
        <button
          onClick={runAnalysis}
          className="w-full py-4 bg-amber-glow text-void font-display font-bold text-base rounded-xl hover:bg-amber-400 transition-all duration-200 glow-amber hover:scale-[1.01]"
        >
          Analyze Video →
        </button>
      )}

      {/* Results */}
      {result && progress.stage === 'done' && (
        <div className="space-y-4">
          <ResultsDisplay analysis={result} previewUrl={previewUrl} plan={plan} />
          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="flex-1 py-3 border border-border text-slate-400 font-display text-sm rounded-lg hover:border-amber-glow hover:text-amber-glow transition-colors"
            >
              Analyze Another
            </button>
            <a
              href="/dashboard"
              className="flex-1 py-3 border border-border text-slate-400 font-display text-sm rounded-lg hover:border-amber-glow hover:text-amber-glow transition-colors text-center"
            >
              View History
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
