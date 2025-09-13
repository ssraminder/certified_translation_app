import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // safe in serverless function
);

export async function handler(event: any) {
  const jobId = event.queryStringParameters?.jobId;
  if (!jobId) return { statusCode: 400, body: 'Missing jobId' };

  const { data: job } = await supabase
    .from('quote_jobs')
    .select('*')
    .eq('job_id', jobId)
    .single();

  const { data: events } = await supabase
    .from('quote_job_events')
    .select('*')
    .eq('job_id', jobId)
    .order('ts', { ascending: true });

  return {
    statusCode: 200,
    body: JSON.stringify({ job, events, result: job?.result })
  };
}
