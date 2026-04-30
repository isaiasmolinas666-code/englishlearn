exports.handler = async function(event) {
  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing messages' }) };
  }

  // La API key se guarda como variable de entorno en Netlify (nunca visible al usuario)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'guiaunpocomasmejoraun.netlify.app', // cambiá por tu URL de Netlify
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
