import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const { jobId } = event.queryStringParameters || {};
  if (!jobId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing jobId' }) };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing environment variables' }) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  const { data: job, error: jobError } = await supabase
    .from('quote_jobs')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (jobError || !job) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Job not found' }) };
  }

  const { data: events } = await supabase
    .from('quote_job_events')
    .select('*')
    .eq('job_id', jobId)
    .order('ts', { ascending: true });

  let result = null;
  if (job.status === 'completed') {
    const { data: quote } = await supabase
      .from('orders')
      .select('*')
      .eq('id', job.quote_id)
      .single();
    result = quote;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ job, events: events || [], result }),
  };
};

export { handler };
