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

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE, API_KEY } = process.env;
  const missing = [] as string[];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE) missing.push('SUPABASE_SERVICE_ROLE');
  if (!API_KEY) missing.push('API_KEY');
  if (missing.length) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Missing environment variables: ${missing.join(', ')}` }),
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
      fileName,
      fileType,
      fileBase64,
    } = body;

    if (!name || !email || !sourceLang || !targetLang || !fileName || !fileType || !fileBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const buffer = Buffer.from(fileBase64, 'base64');
    const path = `orders/${Date.now()}-${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('orders')
      .upload(path, buffer, { contentType: fileType });

    if (uploadError) throw uploadError;

    // Google Vision OCR
    const visionBody = {
      requests: [
        {
          image: { content: fileBase64 },
          features: [{ type: 'TEXT_DETECTION' }],
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

    // Gemini analysis
    const geminiBody = {
      contents: [
        {
          parts: [
            {
              text: `Analyze the following text and summarize any key information:\n${ocrText}`,
            },
          ],
        },
      ],
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
    const analysis =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const { data: inserted, error: insertError } = await supabase
      .from('orders')
      .insert({
        name,
        email,
        phone,
        data: { sourceLang, targetLang, filePath: path, ocrText, analysis },
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: inserted.id, ocrText, analysis }),
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
