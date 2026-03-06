'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthNav from '@/components/AuthNav';

const STATS = [
  { value: '94.7%', label: 'Detection Accuracy' },
  { value: '<8s', label: 'Average Analysis Time' },
  { value: '6+', label: 'Supported Formats' },
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: 'Frame-Level Analysis',
    desc: 'Every 2 seconds of your video is analyzed individually. Inconsistencies across frames reveal AI generation patterns invisible to the human eye.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
      </svg>
    ),
    title: 'Neural Network Detection',
    desc: 'Powered by state-of-the-art deepfake detection models trained on millions of real and synthetic videos. Catches GAN artifacts, diffusion models, and face-swaps.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Confidence Scoring',
    desc: 'Each analysis returns a 0-100 confidence score with per-frame breakdown. Not just a verdict — full forensic transparency.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
    title: 'Full Analysis History',
    desc: 'Every video you submit is logged with timestamps, scores, and frame data. Build an audit trail for content moderation or research.',
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-void overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-100" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-glow opacity-[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-signal-blue opacity-[0.04] rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10">
        <AuthNav />

        {/* Hero */}
        <section className="pt-24 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
          <div
            className="text-center"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-panel mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-real animate-pulse" />
              <span className="font-mono text-xs text-slate-400 tracking-widest uppercase">
                Forensic AI Analysis
              </span>
            </div>

            <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight leading-none mb-6">
              <span className="text-slate-100">Is this video</span>
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 50%, #F59E0B 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                real?
              </span>
            </h1>

            <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-body">
              VeriFrame uses forensic deep learning to detect AI-generated and deepfake videos.
              Upload any video — get a frame-by-frame authenticity report in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="group relative px-8 py-4 bg-amber-glow text-void font-display font-semibold text-base rounded-lg hover:bg-amber-400 transition-all duration-200 glow-amber"
              >
                Start Analyzing Free
                <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-4 border border-border text-slate-300 font-display font-medium text-base rounded-lg hover:border-amber-glow hover:text-amber-glow transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-4 mt-20 max-w-2xl mx-auto"
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.7s ease 0.3s',
            }}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center p-4">
                <div className="font-display text-3xl font-bold text-amber-glow mb-1">
                  {stat.value}
                </div>
                <div className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mock terminal / analysis preview */}
        <section className="px-4 sm:px-6 max-w-4xl mx-auto mb-24">
          <div className="corner-border rounded-xl border border-border bg-deep overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-signal-fake opacity-80" />
                <span className="w-3 h-3 rounded-full bg-amber-glow opacity-80" />
                <span className="w-3 h-3 rounded-full bg-signal-real opacity-80" />
              </div>
              <span className="font-mono text-xs text-slate-500 ml-2">veriframe — analysis output</span>
            </div>

            {/* Terminal body */}
            <div className="p-6 font-mono text-sm space-y-2">
              <p className="text-slate-500">{'>'} Loading video: <span className="text-slate-300">suspicious_clip.mp4</span></p>
              <p className="text-slate-500">{'>'} Extracting frames at 2s intervals...</p>
              <p className="text-slate-500">{'>'} Analyzing frame 1/8 <span className="text-amber-glow">[00:00]</span> — score: <span className="text-signal-fake">0.87</span></p>
              <p className="text-slate-500">{'>'} Analyzing frame 2/8 <span className="text-amber-glow">[00:02]</span> — score: <span className="text-signal-fake">0.91</span></p>
              <p className="text-slate-500">{'>'} Analyzing frame 3/8 <span className="text-amber-glow">[00:04]</span> — score: <span className="text-signal-fake">0.79</span></p>
              <p className="text-slate-500">{'>'} Analyzing frame 4/8 <span className="text-amber-glow">[00:06]</span> — score: <span className="text-signal-fake">0.94</span></p>
              <p className="text-slate-500">{'>'} Aggregating results...</p>
              <div className="mt-4 p-4 border border-signal-fake/30 rounded-lg bg-signal-fake/5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-signal-fake font-semibold text-base">⚠ AI-GENERATED DETECTED</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Confidence Score</span>
                    <div className="text-signal-fake text-lg font-bold">87.8%</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Frames Analyzed</span>
                    <div className="text-slate-200 text-lg font-bold">8 / 8</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 sm:px-6 max-w-6xl mx-auto mb-24">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
              How it works
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A multi-layer forensic pipeline designed to catch what the eye misses.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="p-6 border border-border bg-surface rounded-xl hover:border-amber-glow/30 transition-colors duration-300 group"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div className="w-10 h-10 rounded-lg bg-panel border border-border flex items-center justify-center text-amber-glow mb-4 group-hover:border-amber-glow/50 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-display font-semibold text-slate-100 mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 max-w-3xl mx-auto mb-24 text-center">
          <div className="p-12 border border-border rounded-2xl bg-surface relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-glow" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
                Ready to detect?
              </h2>
              <p className="text-slate-400 mb-8">
                Free to start. No credit card required. Upload your first video in 30 seconds.
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-amber-glow text-void font-display font-semibold rounded-lg hover:bg-amber-400 transition-colors glow-amber"
              >
                Create Free Account
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border px-4 sm:px-6 py-8 text-center">
          <p className="font-mono text-xs text-slate-600">
            VeriFrame © {new Date().getFullYear()} — AI Video Authenticity Analysis
          </p>
        </footer>
      </div>
    </div>
  );
}