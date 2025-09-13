import React, { useEffect, useState, useRef } from 'react';

type JobEvent = { ts: string; step: string; message: string; progress?: number };
type Job = { status: string; error?: string };

interface Props {
  jobId: string;
  onResolved: (r: { status: 'succeeded' | 'failed'; result?: any; error?: string; events: JobEvent[] }) => void;
}

export default function AnalysisOverlay({ jobId, onResolved }: Props) {
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const resolved = useRef(false);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/.netlify/functions/quote-status?jobId=${jobId}`);
        const { job, events, result } = await res.json();
        setJob(job);
        setEvents(events || []);
        if (!resolved.current) {
          if (job?.status === 'succeeded') {
            resolved.current = true;
            onResolved({ status: 'succeeded', result, events: events || [] });
          }
          if (job?.status === 'failed') {
            resolved.current = true;
            onResolved({ status: 'failed', error: job.error, events: events || [] });
          }
        }
      } catch {
        setEvents(prev => [
          ...prev,
          {
            ts: new Date().toISOString(),
            step: 'client',
            message: 'Lost connection to status endpoint… retrying'
          }
        ]);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [jobId, onResolved]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80">
      <div className="w-16 h-16 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" aria-live="polite"></div>
      <p className="mt-4 text-[var(--accent-color)] text-lg font-medium text-center px-4">
        We’re analyzing your files. This usually takes a moment.
      </p>
      {jobId && (
        <div className="mt-4 w-full max-w-md overflow-hidden rounded-lg shadow bg-white dark:bg-slate-800" role="log" aria-live="polite">
          <div className="max-h-56 overflow-auto divide-y divide-gray-200 dark:divide-slate-700">
            {events.map((e, i) => (
              <div key={i} className="px-4 py-2 text-sm grid grid-cols-6 gap-2 items-center">
                <span className="col-span-2 opacity-70 font-mono text-xs">{new Date(e.ts).toLocaleTimeString()}</span>
                <span className="col-span-2 font-semibold uppercase tracking-wide">{e.step}</span>
                <span className="col-span-2">{e.message}</span>
                {typeof e.progress === 'number' && (
                  <progress max={100} value={e.progress} className="col-span-6 w-full" />
                )}
              </div>
            ))}
            {job?.status === 'failed' && (
              <div className="px-4 py-2 text-sm text-red-500">⚠️ {job.error || 'Unexpected error'}</div>
            )}
            {job?.status === 'succeeded' && (
              <div className="px-4 py-2 text-sm text-green-600">✅ Analysis complete. Building your quote…</div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      )}
    </div>
  );
}
