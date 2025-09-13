import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { initJob, logEvent, endJob } from './_progress';

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, API_KEY } = process.env;

  const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !supabaseKey || !API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing environment variables' }),
    };
  }

  let jobId: string | undefined;

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      name,
      email,
      phone,
      sourceLang,
      targetLang,
      fileName,
      fileType,
      fileBase64,
    } = body;

    if (!name || !email || !sourceLang || !targetLang || !fileName || !fileType || !fileBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = createClient(SUPABASE_URL, supabaseKey);

    jobId = await initJob();
    await logEvent(jobId, 'upload', 'Received files…', 5);

    const buffer = Buffer.from(fileBase64, 'base64');
    const path = `orders/${Date.now()}-${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('orders')
      .upload(path, buffer, { contentType: fileType });

    if (uploadError) throw uploadError;

    await logEvent(jobId, 'ocr', 'Running OCR on uploaded files…', 15);

    // Google Vision OCR
    const featureType =
      fileType === 'application/pdf' || fileType === 'image/tiff'
        ? 'DOCUMENT_TEXT_DETECTION'
        : 'TEXT_DETECTION';

    const visionBody = {
      requests: [
        {
          image: { content: fileBase64 },
          features: [{ type: featureType }],
        },
      ],
    };

    const visionResp = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visionBody),
      }
    );

    if (!visionResp.ok) {
      const text = await visionResp.text();
      throw new Error(text);
    }

    const visionData = await visionResp.json();
    const ocrText = visionData.responses?.[0]?.fullTextAnnotation?.text || '';

    await logEvent(jobId, 'gemini', 'Analyzing language & complexity…', 50);

    // Gemini analysis
    const geminiBody = {
      contents: [
        {
          parts: [
            {
              text:
                'Given the OCR text below, identify the language and classify overall complexity as Easy, Medium, or Hard. ' +
                'Respond with JSON: {"language":"<language>","complexity":"<Easy|Medium|Hard>"}.\n\n' +
                ocrText,
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json' },
    };

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!geminiResp.ok) {
      const text = await geminiResp.text();
      throw new Error(text);
    }

    const geminiData = await geminiResp.json();
    let language = '';
    let complexity = '';
    try {
      const parsed = JSON.parse(
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      );
      language = parsed.language || '';
      complexity = parsed.complexity || '';
    } catch {
      // fall back to empty strings if parsing fails
    }

    await logEvent(jobId, 'db', 'Saving OCR & analysis results…', 75);

    const { data: inserted, error: insertError } = await supabase
      .from('orders')
      .insert({
        name,
        email,
        phone,
        data: { sourceLang, targetLang, filePath: path, ocrText, language, complexity },
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    await logEvent(jobId, 'pricing', 'Calculating per-page rate, cert, and totals…', 90);

    await endJob(jobId, 'succeeded');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobId, id: inserted.id, ocrText, language, complexity }),
    };
  } catch (error: any) {
    if (jobId) await endJob(jobId, 'failed', error.message || String(error));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ jobId, error: error.message || 'Unknown error' }),
    };
  }
};

export { handler };
