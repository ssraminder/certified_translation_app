import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { initJob, logEvent } from './_progress';

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE, SUPABASE_ANON_KEY } = process.env;
  const supabaseKey = SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !supabaseKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing environment variables' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { customerName, customerEmail, customerPhone, sourceLanguage, targetLanguage, intendedUse, files } = body;
    if (!customerName || !customerEmail || !sourceLanguage || !targetLanguage || !intendedUse || !Array.isArray(files) || files.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = createClient(SUPABASE_URL, supabaseKey);
    const jobId = await initJob();
    await logEvent(jobId, 'upload', 'Received files…', 5);

    const stored: { fileName: string; fileType: string; path: string }[] = [];
    for (const f of files) {
      const { fileName, fileType, fileBase64 } = f;
      if (!fileName || !fileType || !fileBase64) continue;
      const buffer = Buffer.from(fileBase64, 'base64');
      const path = `orders/${Date.now()}-${fileName}`;
      const { error: uploadError } = await supabase.storage.from('orders').upload(path, buffer, { contentType: fileType });
      if (uploadError) throw uploadError;
      stored.push({ fileName, fileType, path });
    }

    // trigger background processing
    await fetch(`${process.env.URL || ''}/.netlify/functions/quote-process`, {
      method: 'POST',
      body: JSON.stringify({ jobId, customerName, customerEmail, customerPhone, sourceLanguage, targetLanguage, intendedUse, files: stored }),
    });

    return { statusCode: 200, headers, body: JSON.stringify({ jobId }) };
  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Unknown error' }) };
  }
};

export { handler };
