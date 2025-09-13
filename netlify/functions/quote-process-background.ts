import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Background function to process quote jobs
const handler: Handler = async (event) => {
  // Parse payload coming from the queue/background invocation
  const payload = event.body ? JSON.parse(event.body) : {};
  const jobId: string | undefined = payload.jobId;

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE, API_KEY } = process.env;

  // If required environment variables are missing, log and end the job as failed
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !API_KEY) {
    console.error('Missing environment variables', {
      hasUrl: Boolean(SUPABASE_URL),
      hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE),
      hasApiKey: Boolean(API_KEY),
    });

    // If we have enough information to communicate with the DB, update the job status
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE && jobId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
      try {
        await supabase.from('quote_job_events').insert({ job_id: jobId, event: 'missing_env_vars' });
        await supabase.from('quote_jobs').update({ status: 'failed' }).eq('id', jobId);
      } catch (err) {
        console.error('Failed to log missing env var event', err);
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'failed', error: 'Missing environment variables' }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  // Compute the quote result here (placeholder)
  const result = payload.result || { quote: {}, files: [] };

  try {
    // Insert the top-level quote information
    const { data: quoteData, error: quoteErr } = await supabase
      .from('Quotes')
      .insert(result.quote)
      .select('quoteId')
      .single();

    if (quoteErr || !quoteData) {
      throw quoteErr || new Error('Failed to insert quote');
    }

    const quoteId = quoteData.quoteId;

    // Insert files and pages
    for (const file of result.files) {
      const { pages = [], ...fileData } = file;

      const { data: fileInsert, error: fileErr } = await supabase
        .from('QuoteFiles')
        .insert({ ...fileData, quoteId })
        .select('fileId')
        .single();

      if (fileErr || !fileInsert) {
        throw fileErr || new Error('Failed to insert file');
      }

      const fileId = fileInsert.fileId;

      if (pages.length > 0) {
        const pagesRows = pages.map((p: any) => ({ ...p, fileId }));
        const { error: pageErr } = await supabase.from('QuotePages').insert(pagesRows);
        if (pageErr) {
          throw pageErr;
        }
      }
    }

    // Update the quote_jobs table with the new quoteId
    if (jobId) {
      await supabase.from('quote_jobs').update({ quote_id: quoteId }).eq('id', jobId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'completed', quoteId }),
    };
  } catch (err: any) {
    console.error('Quote processing failed', err);

    if (jobId) {
      await supabase.from('quote_job_events').insert({ job_id: jobId, event: 'processing_failed', details: err.message });
      await supabase.from('quote_jobs').update({ status: 'failed' }).eq('id', jobId);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'failed', error: err.message || 'Unknown error' }),
    };
  }
};

export { handler };

