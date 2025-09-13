import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

interface EventLogger {
  (step: string, message: string, progress: number): Promise<void>;
}

const handler: Handler = async (event) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE, API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !API_KEY) {
    return { statusCode: 500, body: 'Missing environment variables' };
  }

  try {
    const { jobId } = JSON.parse(event.body || '{}');
    if (!jobId) {
      return { statusCode: 400, body: 'Missing jobId' };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const log: EventLogger = async (step, message, progress) => {
      await supabase.from('quote_job_events').insert({ job_id: jobId, step, message, progress });
    };

    const { data: job } = await supabase
      .from('quote_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (!job) {
      return { statusCode: 404, body: 'Job not found' };
    }

    await log('OCR', 'Starting OCR…', 10);

    const { data: quote } = await supabase
      .from('orders')
      .select('*')
      .eq('id', job.quote_id)
      .single();

    if (!quote) {
      await log('ERROR', 'Quote not found', 100);
      await supabase.from('quote_jobs').update({ status: 'failed', error: 'Quote not found' }).eq('job_id', jobId);
      return { statusCode: 404, body: 'Quote not found' };
    }

    const filePath = quote.data?.filePath;
    const { data: file } = await supabase.storage.from('orders').download(filePath);
    const arrayBuffer = file ? await file.arrayBuffer() : null;
    const base64 = arrayBuffer ? Buffer.from(arrayBuffer).toString('base64') : '';

    const visionBody = {
      requests: [
        {
          image: { content: base64 },
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
      await log('OCR', `OCR failed: ${text}`, 100);
      await supabase.from('quote_jobs').update({ status: 'failed', error: text }).eq('job_id', jobId);
      return { statusCode: 500, body: text };
    }

    const visionData = await visionResp.json();
    const ocrText = visionData.responses?.[0]?.fullTextAnnotation?.text || '';

    await log('OCR', 'OCR complete', 40);
    await log('GEMINI', 'Analyzing with Gemini…', 50);

    const geminiBody = {
      contents: [
        {
          parts: [
            {
              text: `Analyze the following text and respond in JSON with fields language, documentType, complexity (Easy|Medium|Hard).\n\n${ocrText}`,
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
      await log('GEMINI', `Gemini failed: ${text}`, 100);
      await supabase.from('quote_jobs').update({ status: 'failed', error: text }).eq('job_id', jobId);
      return { statusCode: 500, body: text }; 
    }

    const geminiData = await geminiResp.json();
    const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let analysis: { language?: string; documentType?: string; complexity?: string } = {};
    try {
      analysis = JSON.parse(geminiText);
    } catch {
      analysis = { result: geminiText } as any;
    }

    const wordCount = ocrText ? ocrText.trim().split(/\s+/).length : 0;
    const complexity = (analysis.complexity as 'Easy' | 'Medium' | 'Hard') || 'Medium';
    const complexityMap: Record<'Easy' | 'Medium' | 'Hard', number> = {
      Easy: 1.0,
      Medium: 1.1,
      Hard: 1.2,
    };
    const complexityMultiplier = complexityMap[complexity];
    const ppwc = wordCount * complexityMultiplier;
    const billablePages = Math.ceil((ppwc / 240) * 10) / 10; // wordsPerPage=240

    await log('GEMINI', 'Gemini analysis complete', 80);
    await log('DB', 'Saving results…', 90);

    const updated = {
      data: {
        ...quote.data,
        ocrText,
        analysis,
        wordCount,
        complexity,
        complexityMultiplier,
        ppwc,
        billablePages,
      },
    };

    await supabase.from('orders').update(updated).eq('id', job.quote_id);

    await log('PRICING', 'Pricing complete', 100);
    await supabase
      .from('quote_jobs')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('job_id', jobId);

    return { statusCode: 200, body: 'OK' };
  } catch (error: any) {
    const { jobId } = JSON.parse(event.body || '{}');
    if (jobId) {
      const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
        await supabase.from('quote_job_events').insert({ job_id: jobId, step: 'ERROR', message: error.message, progress: 100 });
        await supabase
          .from('quote_jobs')
          .update({ status: 'failed', error: error.message })
          .eq('job_id', jobId);
      }
    }
    return { statusCode: 500, body: error.message };
  }
};

export { handler };
