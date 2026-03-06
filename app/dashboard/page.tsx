import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import AuthNav from '@/components/AuthNav';
import AnalysisHistory from '@/components/AnalysisHistory';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const email = session.user.email ?? 'User';
  const initials = email.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-void">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-100" />
      </div>

      <div className="relative z-10">
        <AuthNav />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-20">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-glow/20 border border-amber-glow/30 flex items-center justify-center">
                  <span className="font-display text-xs font-bold text-amber-glow">{initials}</span>
                </div>
                <span className="font-mono text-xs text-slate-500">{email}</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-100 mb-2">
                Analysis History
              </h1>
              <p className="text-slate-400 text-sm">
                All videos you&apos;ve submitted for authenticity analysis.
              </p>
            </div>

            <Link
              href="/upload"
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-amber-glow text-void font-display font-semibold text-sm rounded-lg hover:bg-amber-400 transition-colors glow-amber"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Analysis
            </Link>
          </div>

          {/* History component */}
          <AnalysisHistory userId={session.user.id} />
        </main>
      </div>
    </div>
  );
}