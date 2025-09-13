import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { logEvent, endJob } from './_progress';
import { calculateQuote, FileAnalysis, PageAnalysis, appSettings } from '../../helpers/quoteCalculator';

const handler: Handler = async (event) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE, API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !API_KEY) return;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  try {
    const body = JSON.parse(event.body || '{}');
    const { jobId, customerName, customerEmail, customerPhone, sourceLanguage, targetLanguage, intendedUse, files } = body;
    if (!jobId) return;

    const analyses: FileAnalysis[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      await logEvent(jobId, 'ocr', `Running OCR on ${f.fileName}…`, 15 + i * 10);
      const { data: download } = await supabase.storage.from('orders').download(f.path);
      if (!download) throw new Error('Failed to download file');
      const buffer = await download.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const featureType = f.fileType === 'application/pdf' || f.fileType === 'image/tiff' ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION';
      const visionBody = { requests: [{ image: { content: base64 }, features: [{ type: featureType }] }] };
      const visionResp = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(visionBody)
      });
      if (!visionResp.ok) throw new Error(await visionResp.text());
      const visionData = await visionResp.json();
      const ocrText = visionData.responses?.[0]?.fullTextAnnotation?.text || '';
      const pagesData = visionData.responses?.[0]?.fullTextAnnotation?.pages || [];

      await logEvent(jobId, 'gemini', 'Analyzing language & complexity…', 60);
      const geminiBody = {
        contents: [
          {
            parts: [
              {
                text: 'Given the OCR text below, identify the language, document type, and classify overall complexity as Easy, Medium, or Hard. Respond with JSON: {"language":"<language>","docType":"<type>","complexity":"<Easy|Medium|Hard>"}.\n\n' + ocrText
              }
            ]
          }
        ],
        generationConfig: { responseMimeType: 'application/json' }
      };
      const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody)
      });
      if (!geminiResp.ok) throw new Error(await geminiResp.text());
      const geminiData = await geminiResp.json();
      let language = '', complexity: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      try {
        const parsed = JSON.parse(geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
        language = parsed.language || '';
        if (parsed.complexity === 'Easy' || parsed.complexity === 'Medium' || parsed.complexity === 'Hard') {
          complexity = parsed.complexity;
        }
      } catch {}
      const complexityMap: Record<'Easy' | 'Medium' | 'Hard', number> = { Easy: 1.0, Medium: 1.1, Hard: 1.2 };
      const pages: PageAnalysis[] = [];
      for (let p = 0; p < pagesData.length; p++) {
        const page = pagesData[p];
        const wc = page.blocks?.reduce((sum: number, block: any) => sum + (block.paragraphs?.reduce((s: number, par: any) => s + (par.words ? par.words.length : 0), 0) || 0), 0) || 0;
        const multiplier = complexityMap[complexity];
        const ppwc = wc * multiplier;
        const billable = Math.ceil((ppwc / appSettings.wordsPerPage) * 10) / 10;
        pages.push({ pageNumber: p + 1, wordCount: wc, complexity, complexityMultiplier: multiplier, ppwc, billablePages: billable });
      }
      analyses.push({ fileId: `${i}`, filename: f.fileName, pageCount: pages.length || 1, pages: pages.length ? pages : [{ pageNumber: 1, wordCount: ocrText.trim().split(/\s+/).length, complexity, complexityMultiplier: complexityMap[complexity], ppwc: ocrText.trim().split(/\s+/).length * complexityMap[complexity], billablePages: Math.ceil((ocrText.trim().split(/\s+/).length * complexityMap[complexity] / appSettings.wordsPerPage) * 10) / 10 }] });
    }

    await logEvent(jobId, 'pricing', 'Calculating per-page rate, cert, and totals…', 90);
    const totals = calculateQuote(analyses, { sourceLanguage, targetLanguage, intendedUse });
    const result = { quoteId: jobId, files: analyses, ...totals };
    await supabase.from('quote_jobs').update({ result }).eq('job_id', jobId);
    await endJob(jobId, 'succeeded');
  } catch (error: any) {
    const jobId = (() => { try { return JSON.parse(event.body || '{}').jobId; } catch { return undefined; } })();
    if (jobId) {
      await logEvent(jobId, 'error', error.message || String(error));
      await endJob(jobId, 'failed', error.message || String(error));
    }
  }
  return { statusCode: 200 };
};

export { handler };
