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
        <Link href="/" className="flex items-center">
          <img
            src="/veriframe-wordmark-dark.svg"
            alt="VeriFrame"
            style={{ height: '28px', width: 'auto' }}
          />
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
                  <Link
                    href="/pricing"
                    className="font-mono text-xs text-slate-400 hover:text-amber-glow transition-colors uppercase tracking-wider nav-link"
                  >
                    Pricing
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
                    href="/pricing"
                    className="font-mono text-xs text-slate-400 hover:text-amber-glow transition-colors uppercase tracking-wider nav-link"
                  >
                    Pricing
                  </Link>
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