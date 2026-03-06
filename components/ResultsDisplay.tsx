'use client';

import { useEffect, useState } from 'react';
import type { Analysis, FrameResult } from '@/lib/supabase';

interface ResultsDisplayProps {
  analysis: Analysis;
}

export default function ResultsDisplay({ analysis }: ResultsDisplayProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const score = analysis.confidence_score;
  const isAI = analysis.is_ai_generated;
  const details = analysis.analysis_details;

  const verdictColor = isAI ? 'text-signal-fake' : 'text-signal-real';
  const borderColor = isAI ? 'border-signal-fake/30' : 'border-signal-real/30';
  const bgColor = isAI ? 'bg-signal-fake/5' : 'bg-signal-real/5';
  const glowClass = isAI ? 'glow-fake' : 'glow-real';
  const barColor = isAI ? 'bg-signal-fake' : 'bg-signal-real';

  const frameResults: FrameResult[] = details?.frame_results ?? [];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 w-full">
      {/* Main verdict card */}
      <div className={`border ${borderColor} ${bgColor} ${glowClass} rounded-xl p-6`}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className={`font-mono text-xs uppercase tracking-widest ${verdictColor} mb-1`}>
              Analysis Complete
            </div>
            <h3 className={`font-display text-2xl font-bold ${verdictColor}`}>
              {isAI ? '⚠ AI-Generated Detected' : '✓ Appears Authentic'}
            </h3>
            <p className="text-slate-400 text-sm mt-1 font-mono">
              {analysis.video_filename}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-1">
              Confidence
            </div>
            <div className={`font-display text-4xl font-bold ${verdictColor}`}>
              {score}%
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mb-4">
          <div className="flex justify-between font-mono text-xs text-slate-500 mb-1.5">
            <span>REAL</span>
            <span>AI GENERATED</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
              style={{
                width: animate ? `${score}%` : '0%',
              }}
            />
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
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
              value: details?.model_used ? details.model_used.split('/').pop() ?? 'HF Model' : 'HF Model',
            },
          ].map((item) => (
            <div key={item.label} className="bg-panel rounded-lg p-3 border border-border">
              <div className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-1">
                {item.label}
              </div>
              <div className="font-display font-semibold text-slate-200 text-sm truncate">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frame results */}
      {frameResults.length > 0 && (
        <div className="border border-border bg-surface rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h4 className="font-mono text-xs text-slate-400 uppercase tracking-wider">
              Per-Frame Analysis
            </h4>
            <span className="font-mono text-xs text-slate-600">
              {frameResults.length} frames
            </span>
          </div>
          <div className="divide-y divide-border">
            {frameResults.map((frame, i) => {
              const frameIsAI = frame.score > 50;
              const frameColor = frameIsAI ? 'text-signal-fake' : 'text-signal-real';
              const frameBg = frameIsAI ? 'bg-signal-fake' : 'bg-signal-real';

              return (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-panel/50 transition-colors"
                  style={{
                    opacity: animate ? 1 : 0,
                    transform: animate ? 'translateX(0)' : 'translateX(-8px)',
                    transition: `opacity 0.3s ease ${i * 0.05}s, transform 0.3s ease ${i * 0.05}s`,
                  }}
                >
                  <div className="font-mono text-xs text-slate-600 w-12 shrink-0">
                    {formatTime(frame.timestamp)}
                  </div>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${frameBg} rounded-full`}
                      style={{ width: `${frame.score}%` }}
                    />
                  </div>
                  <div className={`font-mono text-xs ${frameColor} w-12 text-right shrink-0`}>
                    {frame.score.toFixed(1)}%
                  </div>
                  <div className={`font-mono text-xs ${frameColor} w-8 shrink-0`}>
                    {frameIsAI ? 'AI' : 'OK'}
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
          <p className="font-mono text-xs text-amber-glow/70">
            ⚠ Note: {details.error}
          </p>
        </div>
      )}
    </div>
  );
}