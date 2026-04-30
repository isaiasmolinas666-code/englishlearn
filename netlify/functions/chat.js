exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Netlify a veces envía el body en base64
  let rawBody = event.body;
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON: ' + e.message }) };
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid messages array' }) };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured on server' }) };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://guiaunpocomasmejoraun.netlify.app',
        'X-Title': 'English Learning System',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        max_tokens: 300,
        messages: messages,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.error.message }),
      };
    }

    const content = data.choices?.[0]?.message?.content || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to reach OpenRouter: ' + err.message }),
    };
  }
};
