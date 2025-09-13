import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing environment variables' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      name,
      email,
      phone,
      sourceLang,
      targetLang,
      intendedUse,
      fileName,
      fileType,
      fileBase64,
    } = body;

    if (!name || !email || !sourceLang || !targetLang || !intendedUse || !fileName || !fileType || !fileBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const buffer = Buffer.from(fileBase64, 'base64');
    const path = `orders/${Date.now()}-${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('orders')
      .upload(path, buffer, { contentType: fileType });

    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await supabase
      .from('orders')
      .insert({
        name,
        email,
        phone,
        data: { sourceLang, targetLang, intendedUse, filePath: path },
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    const { data: job, error: jobError } = await supabase
      .from('quote_jobs')
      .insert({ quote_id: inserted.id, status: 'pending' })
      .select('job_id')
      .single();

    if (jobError) throw jobError;

    await supabase.from('quote_job_events').insert({
      job_id: job.job_id,
      step: 'UPLOAD',
      message: 'File uploaded',
      progress: 10,
    });

    const host = event.headers['x-forwarded-host'] || event.headers['host'];
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const url = new URL('/.netlify/functions/quote-process-background', `${proto}://${host}`);

    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.job_id }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text);
    }

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({ jobId: job.job_id }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unknown error' }),
    };
  }
};

export { handler };

