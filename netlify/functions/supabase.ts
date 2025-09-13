import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

/**
 * A serverless function to test the connection to Supabase.
 * It fetches the top 1 record from a 'notes' table.
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Allow requests from any origin
  };

  const missing = [] as string[];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE) missing.push('SUPABASE_SERVICE_ROLE');
  if (missing.length) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Missing environment variables: ${missing.join(', ')}` }),
      headers,
    };
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Perform a simple query to test the connection and credentials
    const { data, error } = await supabase
      .from('notes')
      .select('id')
      .limit(1);

    if (error) {
      // Re-throw the error to be caught by the catch block
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully connected to Supabase and performed a query.' }),
      headers,
    };
  } catch (error: any) {
    console.error('Supabase connection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to connect to Supabase.',
        details: error.message || 'An unknown error occurred.',
      }),
      headers,
    };
  }
};

export { handler };
