import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE! // server key only
);

export async function initJob(quoteId?: string) {
  const { data, error } = await supabase
    .from('quote_jobs')
    .insert({ quote_id: quoteId, status: 'running' })
    .select('job_id')
    .single();
  if (error) throw error;
  return data.job_id as string;
}

export async function logEvent(jobId: string, step: string, message: string, progress?: number) {
  await supabase.from('quote_job_events').insert({
    job_id: jobId,
    step,
    message,
    progress
  });
}

export async function endJob(jobId: string, status: 'succeeded' | 'failed', error?: string) {
  await supabase.from('quote_jobs')
    .update({ status, error })
    .eq('job_id', jobId);
}
