'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // If email confirmation is disabled, session is returned immediately
      if (data.session) {
        window.location.href = '/upload';
        return;
      }

      // Otherwise show confirm email message
      setSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none bg-grid opacity-100" />
        <div className="relative w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-signal-real/10 border border-signal-real/30 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-100 mb-3">Check your email</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            We sent a confirmation link to <span className="text-amber-glow">{email}</span>.
            Click it to activate your account and start analyzing videos.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-border text-slate-300 font-display text-sm rounded-lg hover:border-amber-glow hover:text-amber-glow transition-colors"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-100" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-glow opacity-[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-md bg-amber-glow flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#080A0F" strokeWidth="2.5">
                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
              </svg>
            </div>
            <span className="font-display font-bold text-slate-100 text-lg">VeriFrame</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-100">Create account</h1>
          <p className="text-slate-500 text-sm mt-1">Start detecting AI videos for free</p>
        </div>

        {/* Card */}
        <div className="corner-border border border-border bg-surface rounded-xl p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-signal-fake/30 bg-signal-fake/5 text-signal-fake text-sm font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-panel border border-border rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-glow/50 transition-colors font-body"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                minLength={8}
                className="w-full bg-panel border border-border rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-glow/50 transition-colors font-body"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-panel border border-border rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-glow/50 transition-colors font-body"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-glow text-void font-display font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-amber-glow hover:text-amber-400 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
