'use client';

import { useEffect, useRef, useState } from 'react';
import type { Analysis, FrameResult } from '@/lib/supabase';

interface ResultsDisplayProps {
  analysis: Analysis;
  previewUrl?: string | null;
}

// ── Animated confidence counter ────────────────────────────────────────────
function CountUp({ target, duration = 1400 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{value}</>;
}

export default function ResultsDisplay({ analysis, previewUrl }: ResultsDisplayProps) {
  const [revealed, setRevealed] = useState(false);
  const [stampVisible, setStampVisible] = useState(false);

  useEffect(() => {
    // Slight delay so the transition is visible
    const t1 = setTimeout(() => setRevealed(true), 80);
    const t2 = setTimeout(() => setStampVisible(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const score = analysis.confidence_score;
  const isAI = analysis.is_ai_generated;
  const details = analysis.analysis_details;
  const frameResults: FrameResult[] = details?.frame_results ?? [];

  // Color tokens
  const accentColor  = isAI ? '#ef4444' : '#22c55e';
  const accentClass  = isAI ? 'text-signal-fake' : 'text-signal-real';
  const borderClass  = isAI ? 'border-signal-fake/40' : 'border-signal-real/40';
  const bgClass      = isAI ? 'bg-signal-fake/5'    : 'bg-signal-real/5';
  const barClass     = isAI ? 'bg-signal-fake'       : 'bg-signal-real';
  const glowClass    = isAI ? 'glow-fake'            : 'glow-real';
  const overlayColor = isAI ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.14)';
  const vignetteColor= isAI ? 'rgba(239,68,68,0.55)' : 'rgba(34,197,94,0.45)';
  const verdictText  = isAI ? 'AI GENERATED'         : 'AUTHENTIC';

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 w-full">
      <style>{`
        @keyframes stamp-in {
          0%   { transform: scale(1.6) rotate(-4deg); opacity: 0; }
          60%  { transform: scale(0.95) rotate(1deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes vignette-pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.6; }
        }
        @keyframes frame-slide-in {
          from { opacity:0; transform:translateX(-10px); }
          to   { opacity:1; transform:translateX(0); }
        }
        .stamp-anim   { animation: stamp-in 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
        .vignette-anim{ animation: vignette-pulse 2.5s ease-in-out infinite; }
        .frame-row    { animation: frame-slide-in 0.3s ease forwards; }
      `}</style>

      {/* ── Video preview with verdict overlay ── */}
      {previewUrl && (
        <div className={`relative rounded-xl overflow-hidden border-2 ${borderClass} ${glowClass} aspect-video bg-void`}>
          {/* Frozen video thumbnail */}
          <video
            src={previewUrl}
            className="w-full h-full object-contain"
            muted
            playsInline
            preload="auto"
            ref={(v) => { if (v) { v.currentTime = 0; } }}
          />

          {/* Color wash overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ background: overlayColor, opacity: revealed ? 1 : 0 }}
          />

          {/* Edge vignette */}
          {revealed && (
            <div
              className="vignette-anim absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `inset 0 0 60px 20px ${vignetteColor}`,
              }}
            />
          )}

          {/* Corner brackets */}
          {revealed && (
            <>
              {/* TL */}
              <div className="absolute top-3 left-3 w-8 h-8">
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: accentColor }} />
                <div className="absolute top-0 left-0 w-[2px] h-full"  style={{ background: accentColor }} />
              </div>
              {/* TR */}
              <div className="absolute top-3 right-3 w-8 h-8">
                <div className="absolute top-0 right-0 w-full h-[2px]" style={{ background: accentColor }} />
                <div className="absolute top-0 right-0 w-[2px] h-full" style={{ background: accentColor }} />
              </div>
              {/* BL */}
              <div className="absolute bottom-3 left-3 w-8 h-8">
                <div className="absolute bottom-0 left-0 w-full h-[2px]" style={{ background: accentColor }} />
                <div className="absolute bottom-0 left-0 w-[2px] h-full" style={{ background: accentColor }} />
              </div>
              {/* BR */}
              <div className="absolute bottom-3 right-3 w-8 h-8">
                <div className="absolute bottom-0 right-0 w-full h-[2px]" style={{ background: accentColor }} />
                <div className="absolute bottom-0 right-0 w-[2px] h-full" style={{ background: accentColor }} />
              </div>
            </>
          )}

          {/* Verdict stamp — center */}
          {stampVisible && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="stamp-anim px-5 py-2 border-[3px] rounded"
                style={{
                  borderColor: accentColor,
                  background: 'rgba(0,0,0,0.55)',
                  boxShadow: `0 0 24px 6px ${accentColor}55`,
                }}
              >
                <span
                  className="font-display font-black text-2xl sm:text-3xl tracking-[0.15em] uppercase"
                  style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}` }}
                >
                  {isAI ? '⚠ ' : '✓ '}{verdictText}
                </span>
              </div>
            </div>
          )}

          {/* Confidence badge — bottom right */}
          {revealed && (
            <div
              className="absolute bottom-3 right-3 px-2.5 py-1 rounded font-mono text-sm font-bold"
              style={{
                background: 'rgba(0,0,0,0.7)',
                color: accentColor,
                border: `1px solid ${accentColor}55`,
              }}
            >
              <CountUp target={score} />%
            </div>
          )}

          {/* Analysis complete badge — top right */}
          {revealed && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Analysis Complete</span>
            </div>
          )}
        </div>
      )}

      {/* ── Verdict card ── */}
      <div className={`border ${borderClass} ${bgClass} ${glowClass} rounded-xl p-5`}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className={`font-mono text-[10px] uppercase tracking-widest ${accentClass} mb-1`}>
              VeriFrame · Forensic Report
            </div>
            <h3 className={`font-display text-xl font-bold ${accentClass}`}>
              {isAI ? '⚠ AI-Generated Content Detected' : '✓ Content Appears Authentic'}
            </h3>
            <p className="text-slate-500 text-xs mt-1 font-mono truncate max-w-xs">
              {analysis.video_filename}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Confidence</div>
            <div className={`font-display text-4xl font-black ${accentClass}`}>
              {revealed ? <CountUp target={score} /> : 0}%
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mb-4">
          <div className="flex justify-between font-mono text-[10px] text-slate-600 mb-1.5">
            <span>REAL</span>
            <span>AI GENERATED</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden relative">
            <div
              className={`h-full ${barClass} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: revealed ? `${score}%` : '0%' }}
            />
            {/* Threshold marker */}
            <div className="absolute top-0 bottom-0 w-px bg-slate-500/50" style={{ left: '55%' }} />
          </div>
          <div className="flex justify-end font-mono text-[9px] text-slate-700 mt-0.5">
            <span>55% threshold</span>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Frames Analyzed', value: details?.frames_analyzed ?? frameResults.length },
            {
              label: 'Processing Time',
              value: details?.processing_time_ms
                ? `${(details.processing_time_ms / 1000).toFixed(1)}s`
                : 'N/A',
            },
            {
              label: 'Model',
              value: details?.model_used ? (details.model_used.split('/').pop() ?? 'HF') : 'HF Model',
            },
          ].map((item) => (
            <div key={item.label} className="bg-panel rounded-lg p-2.5 border border-border">
              <div className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mb-1">{item.label}</div>
              <div className="font-display font-semibold text-slate-200 text-xs truncate">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-frame analysis ── */}
      {frameResults.length > 0 && (
        <div className="border border-border bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h4 className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Frame-by-Frame Breakdown</h4>
            <span className="font-mono text-[10px] text-slate-600">{frameResults.length} frames</span>
          </div>

          {/* Visual frame grid */}
          <div className="px-4 py-3 flex gap-1.5 flex-wrap border-b border-border">
            {frameResults.map((frame, i) => {
              const fIsAI = frame.score > 50;
              return (
                <div
                  key={i}
                  title={`${formatTime(frame.timestamp)} — ${frame.score.toFixed(1)}%`}
                  className="relative w-8 h-8 rounded flex items-center justify-center"
                  style={{
                    background: fIsAI
                      ? `rgba(239,68,68,${0.15 + (frame.score / 100) * 0.5})`
                      : `rgba(34,197,94,${0.15 + ((100 - frame.score) / 100) * 0.4})`,
                    border: `1px solid ${fIsAI ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.3)'}`,
                    opacity: revealed ? 1 : 0,
                    transition: `opacity 0.3s ease ${i * 0.06}s`,
                  }}
                >
                  <span className="font-mono text-[8px]" style={{ color: fIsAI ? '#ef4444' : '#22c55e' }}>
                    {fIsAI ? '✗' : '✓'}
                  </span>
                </div>
              );
            })}
            <div className="w-full flex gap-3 mt-2 font-mono text-[9px] text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-signal-fake/50 inline-block" /> AI frame
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-signal-real/50 inline-block" /> Real frame
              </span>
            </div>
          </div>

          {/* Detailed rows */}
          <div className="divide-y divide-border">
            {frameResults.map((frame, i) => {
              const fIsAI = frame.score > 50;
              const frameColor = fIsAI ? 'text-signal-fake' : 'text-signal-real';
              const frameBg    = fIsAI ? 'bg-signal-fake' : 'bg-signal-real';
              return (
                <div
                  key={i}
                  className="frame-row flex items-center gap-4 px-4 py-2.5 hover:bg-panel/50 transition-colors"
                  style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
                >
                  <div className="font-mono text-[10px] text-slate-600 w-10 shrink-0">{formatTime(frame.timestamp)}</div>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${frameBg} rounded-full transition-all duration-700`}
                      style={{ width: revealed ? `${frame.score}%` : '0%', transitionDelay: `${0.3 + i * 0.05}s` }}
                    />
                  </div>
                  <div className={`font-mono text-[10px] ${frameColor} w-10 text-right shrink-0`}>
                    {frame.score.toFixed(1)}%
                  </div>
                  <div
                    className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${frameColor} shrink-0`}
                    style={{ background: fIsAI ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid currentColor` }}
                  >
                    {fIsAI ? 'AI' : 'OK'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error note */}
      {details?.error && (
        <div className="border border-amber-glow/20 bg-amber-glow/5 rounded-lg p-3">
          <p className="font-mono text-xs text-amber-glow/70">⚠ Note: {details.error}</p>
        </div>
      )}
    </div>
  );
}