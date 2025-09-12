import Stripe from 'stripe';
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

/**
 * A serverless function to verify Stripe connectivity by retrieving account balance.
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const { STRIPE_SECRET_KEY } = process.env;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe environment variable (STRIPE_SECRET_KEY) is not set in the Netlify dashboard.' }),
      headers,
    };
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const balance = await stripe.balance.retrieve();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully connected to Stripe.', balance }),
      headers,
    };
  } catch (error: any) {
    console.error('Stripe connection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to connect to Stripe.',
        details: error.message || 'An unknown error occurred.',
      }),
      headers,
    };
  }
};

export { handler };
