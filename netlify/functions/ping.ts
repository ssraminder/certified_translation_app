import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

/**
 * A simple serverless function to check API health.
 * It responds with a "pong" message.
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "pong" }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Allow requests from any origin
    },
  };
};

export { handler };
