'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <nav className="border-b border-border bg-void/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-amber-glow flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080A0F" strokeWidth="2.5">
              <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
            </svg>
          </div>
          <span className="font-display font-bold text-slate-100 tracking-tight">VeriFrame</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          {!loading && (
            <>
              {user ? (
                <>
                  <Link
                    href="/upload"
                    className="font-mono text-xs text-slate-400 hover:text-amber-glow transition-colors uppercase tracking-wider nav-link"
                  >
                    Analyze
                  </Link>
                  <Link
                    href="/dashboard"
                    className="font-mono text-xs text-slate-400 hover:text-amber-glow transition-colors uppercase tracking-wider nav-link"
                  >
                    History
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="font-mono text-xs text-slate-500 hover:text-signal-fake transition-colors uppercase tracking-wider"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="font-mono text-xs text-slate-400 hover:text-slate-100 transition-colors uppercase tracking-wider"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-4 py-1.5 bg-amber-glow text-void font-mono text-xs font-semibold rounded-md hover:bg-amber-400 transition-colors uppercase tracking-wider"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}