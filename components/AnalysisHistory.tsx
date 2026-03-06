'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, type Analysis } from '@/lib/supabase';

export default function AnalysisHistory({ userId }: { userId: string }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('analyses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;
        setAnalyses(data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analyses');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-border border-t-amber-glow animate-spin" />
          <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Loading history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-signal-fake/30 bg-signal-fake/5 rounded-xl">
        <p className="font-mono text-sm text-signal-fake">{error}</p>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full border border-border bg-panel flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A3A55" strokeWidth="1.5">
            <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
          </svg>
        </div>
        <h3 className="font-display font-semibold text-slate-400 mb-2">No analyses yet</h3>
        <p className="text-slate-500 text-sm mb-6">Upload your first video to get started.</p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-glow text-void font-display font-semibold text-sm rounded-lg hover:bg-amber-400 transition-colors"
        >
          Analyze a Video
        </Link>
      </div>
    );
  }

  const totalAnalyzed = analyses.length;
  const aiDetected = analyses.filter((a) => a.is_ai_generated).length;
  const avgScore = Math.round(
    analyses.reduce((sum, a) => sum + a.confidence_score, 0) / analyses.length
  );

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Analyzed', value: totalAnalyzed, color: 'text-slate-200' },
          { label: 'AI Detected', value: aiDetected, color: 'text-signal-fake' },
          { label: 'Avg. Score', value: `${avgScore}%`, color: 'text-amber-glow' },
        ].map((stat) => (
          <div key={stat.label} className="border border-border bg-surface rounded-xl p-4 text-center">
            <div className={`font-display text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 bg-panel border-b border-border">
          {['File', 'Score', 'Verdict', 'Date'].map((h) => (
            <div key={h} className="font-mono text-xs text-slate-500 uppercase tracking-wider">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {analyses.map((analysis, i) => {
            const isAI = analysis.is_ai_generated;
            const verdictColor = isAI ? 'text-signal-fake' : 'text-signal-real';
            const scoreBg = isAI ? 'bg-signal-fake' : 'bg-signal-real';
            const date = new Date(analysis.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: '2-digit',
            });

            return (
              <div
                key={analysis.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3.5 hover:bg-panel/50 transition-colors"
                style={{
                  animationDelay: `${i * 0.03}s`,
                }}
              >
                {/* Filename */}
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-300 truncate">{analysis.video_filename}</p>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${scoreBg} rounded-full`}
                      style={{ width: `${analysis.confidence_score}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-slate-400 w-8 text-right">
                    {analysis.confidence_score}%
                  </span>
                </div>

                {/* Verdict badge */}
                <div className={`font-mono text-xs font-semibold ${verdictColor} shrink-0`}>
                  {isAI ? 'AI' : 'REAL'}
                </div>

                {/* Date */}
                <div className="font-mono text-xs text-slate-600 shrink-0">{date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}