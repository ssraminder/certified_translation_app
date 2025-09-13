import React, { useEffect, useState } from 'react';

interface Event {
  id?: number;
  ts: string;
  step: string;
  message: string;
  progress: number;
}

interface QuoteJobStatusProps {
  jobId: string;
  onComplete: (result: any) => void;
  onError: (message: string) => void;
}

const QuoteJobStatus: React.FC<QuoteJobStatusProps> = ({ jobId, onComplete, onError }) => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const resp = await fetch(`/.netlify/functions/quote-status?jobId=${jobId}`);
      const data = await resp.json();
      setEvents(data.events);
      if (data.job.status === 'completed') {
        clearInterval(interval);
        onComplete(data.result);
      } else if (data.job.status === 'failed') {
        clearInterval(interval);
        onError(data.job.error || 'Job failed');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, onComplete, onError]);

  return (
    <div className="flex flex-col items-center py-10" role="region" aria-live="polite">
      <div className="w-16 h-16 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg font-medium">We’re analyzing your files…</p>
      <ul className="mt-6 w-full max-w-md h-64 overflow-auto border rounded p-2 text-sm">
        {events.map(e => (
          <li key={`${e.ts}-${e.step}`} className="mb-1">
            <span className="opacity-60 mr-2">{new Date(e.ts).toLocaleTimeString()}</span>
            <span className="font-semibold mr-2">{e.step}</span>
            <span>{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QuoteJobStatus;
