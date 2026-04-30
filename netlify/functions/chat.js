exports.handler = async function(event) {
  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Netlify a veces envía el body en base64
  let rawBody = event.body;
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
  }

  console.log('RAW BODY:', rawBody ? rawBody.substring(0, 200) : 'EMPTY');

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    console.log('JSON PARSE ERROR:', e.message);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON: ' + e.message }) };
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    console.log('MISSING MESSAGES, body keys:', Object.keys(body));
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid messages array' }) };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('NO API KEY IN ENV');
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured on server' }) };
  }

  console.log('Calling OpenRouter with', messages.length, 'messages');

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
       model: 'openrouter/free',
        max_tokens: 300,
        messages: messages,
      }),
    });

    const responseText = await response.text();
    console.log('OpenRouter status:', response.status);
    console.log('OpenRouter response:', responseText.substring(0, 300));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch(e) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OpenRouter returned non-JSON: ' + responseText.substring(0, 100) }),
      };
    }

    if (data.error) {
      console.log('OpenRouter error:', JSON.stringify(data.error));
      return {
        statusCode: 200, // Devolvemos 200 para que el front no lo interprete como "connection error"
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'API error: ' + (data.error.message || JSON.stringify(data.error)) }),
      };
    }

    const content = data.choices?.[0]?.message?.content || '';
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ content }),
    };
  } catch (err) {
    console.log('FETCH ERROR:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to reach OpenRouter: ' + err.message }),
    };
  }
};
