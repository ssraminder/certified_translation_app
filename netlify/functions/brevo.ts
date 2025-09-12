import type { Handler } from "@netlify/functions";

const handler: Handler = async () => {
  const apiKey = process.env.BREVO_API_KEY;
  const toEmail = process.env.BREVO_TEST_EMAIL;
  const fromEmail = process.env.BREVO_SENDER_EMAIL || toEmail;

  if (!apiKey || !toEmail) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing BREVO_API_KEY or BREVO_TEST_EMAIL environment variables" }),
    };
  }

  const payload = {
    sender: { email: fromEmail },
    to: [{ email: toEmail }],
    subject: "Test Email from Netlify",
    htmlContent: "<p>This is a test email sent from a Netlify function.</p>",
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return { statusCode: response.status, body: text };
    }

    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
