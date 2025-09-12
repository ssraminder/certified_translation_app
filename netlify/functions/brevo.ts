import SibApiV3Sdk from 'sib-api-v3-sdk';
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

/**
 * A serverless function to verify Brevo connectivity by sending a test email.
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const { BREVO_API_KEY, BREVO_TEST_TO_EMAIL, BREVO_TEST_FROM_EMAIL } = process.env;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!BREVO_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Brevo environment variable (BREVO_API_KEY) is not set in the Netlify dashboard.' }),
      headers,
    };
  }

  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications['api-key'].apiKey = BREVO_API_KEY;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = {
      sender: { email: BREVO_TEST_FROM_EMAIL || 'sender@example.com', name: 'Brevo Test' },
      to: [{ email: BREVO_TEST_TO_EMAIL || 'recipient@example.com', name: 'Brevo Recipient' }],
      subject: 'Brevo test',
      textContent: 'Checking Brevo connection'
    };

    await emailApi.sendTransacEmail(sendSmtpEmail);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent via Brevo.' }),
      headers,
    };
  } catch (error: any) {
    console.error('Brevo connection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send email via Brevo.',
        details: error.message || 'An unknown error occurred.',
      }),
      headers,
    };
  }
};

export { handler };
