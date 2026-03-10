import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthNav from '@/components/AuthNav';
import VideoUpload from '@/components/VideoUpload';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Fetch subscription plan for feature gating
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', session.user.id)
    .single();

  const plan: string =
    sub?.status === 'active' && sub?.plan ? sub.plan : 'free';

  return (
    <div className="min-h-screen bg-void">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-100" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-glow opacity-[0.025] rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10">
        <AuthNav />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-20">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-real animate-pulse" />
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                Live Analysis
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-100 mb-2">
              Upload Video
            </h1>
            <p className="text-slate-400 text-sm">
              Drop any video file. Our forensic AI will analyze it frame by frame
              and return a detailed authenticity report.
            </p>
          </div>

          {/* How it works hint */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { step: '01', label: 'Upload', desc: 'Select your video file' },
              { step: '02', label: 'Extract', desc: 'Frames sampled every 2s' },
              { step: '03', label: 'Analyze', desc: 'Neural net scores each frame' },
            ].map((s) => (
              <div key={s.step} className="border border-border rounded-lg p-3 bg-surface">
                <div className="font-mono text-xs text-slate-600 mb-1">{s.step}</div>
                <div className="font-display text-sm font-semibold text-slate-200 mb-0.5">{s.label}</div>
                <div className="text-xs text-slate-500">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Main upload component */}
          <VideoUpload userId={session.user.id} plan={plan} />
        </main>
      </div>
    </div>
  );
}
