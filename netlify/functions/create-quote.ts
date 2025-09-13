import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { generateQuoteId } from './utils/generateQuoteId';

const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env;
  const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !supabaseKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing environment variables' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      customerName,
      customerEmail,
      customerPhone,
      sourceLanguage,
      targetLanguage,
      intendedUse,
      perPageRate,
      totalBillablePages,
      certType,
      certPrice,
      quoteTotal,
    } = body;

    if (
      !customerName ||
      !customerEmail ||
      !sourceLanguage ||
      !targetLanguage ||
      !intendedUse ||
      typeof perPageRate !== 'number' ||
      typeof totalBillablePages !== 'number' ||
      typeof certType !== 'string' ||
      typeof certPrice !== 'number' ||
      typeof quoteTotal !== 'number'
    ) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = createClient(SUPABASE_URL, supabaseKey);
    const quoteId = await generateQuoteId(supabase);

    const { error } = await supabase.from('Quotes').insert({
      quoteId,
      customerName,
      customerEmail,
      customerPhone,
      sourceLanguage,
      targetLanguage,
      intendedUse,
      perPageRate,
      totalBillablePages,
      certType,
      certPrice,
      quoteTotal,
    });

    if (error) throw error;

    return { statusCode: 200, headers, body: JSON.stringify({ quoteId }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Unknown error' }) };
  }
};

export { handler };
