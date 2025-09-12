import type { Handler } from "@netlify/functions";

// Sample base64-encoded PNG image containing the text "Hello"
const sampleImage =
  "iVBORw0KGgoAAAANSUhEUgAAAMgAAABGCAIAAAAGgExhAAACI0lEQVR4nO3asYriQACH8dmLuKKFaUVs9AGstBGCgpWlpQoWAd/BJ/AhBAvrgKWWFhaSJ7ASRAQ7bQwIYq4Q5LiVDXj353a971fNmJGM8MUE8S0MQwP8bT/+9QbwmggLEoQFCcKCBGFBgrAgQViQICxIEBYkCAsShAWJ6LBs2/5k+vDQJ2vwn+AbCxJPhnU4HDqdTr1edxzH9/2Ha/b7faPRcByn0Wjs9/s/2CS+oTBKOp3+OHVdd7lchmG42WyKxeJvK2+DVqs1Ho/DMByPx+12O/JEeCVvYdT/sZLJZLlcvk993w+CIJfLFQqF2yu73W61WlmWZdv28Xg0xtwG2Wx2vV6/v7+fz+d8Pr/b7WRXB76cWOSKeDw+n8/v09uD+eVymc1miUTier0uFgvLsj6+MTJZvLAnn7EqlcpkMjHGTKfTwWDwcE2tVvM8zxjjeV61Wn12h/iWom+F9xvcr9Ptdtvr9YIgiMViw+Ewn88bY0qlUrPZ7Pf7t0G323Vd93Q6pVKp0WiUyWSknwRfSnRYwBP4HQsShAUJwoIEYUGCsCBBWJAgLEgQFiQICxKEBQnCggRhQYKwIEFYkCAsSBAWJAgLEoQFCcKCBGFBgrAgQViQICxIEBYkCAsShAUJwoIEYUGCsCBBWJAgLEgQFiQICxKEBQnCggRhQYKwIEFYkCAsSBAWJAgLEoQFCcKCBGFBgrAgQViQICxIEBYkCAsSPwElPa4nkCj/vAAAAABJRU5ErkJggg==";

const handler: Handler = async () => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing API_KEY environment variable" }),
    };
  }

  const body = {
    requests: [
      {
        image: { content: sampleImage },
        features: [{ type: "TEXT_DETECTION" }],
      },
    ],
  };

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { statusCode: response.status, body: text };
    }

    const data = await response.json();
    const detectedText = data.responses?.[0]?.fullTextAnnotation?.text || "";

    return {
      statusCode: 200,
      body: JSON.stringify({ text: detectedText }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
