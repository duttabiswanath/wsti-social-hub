exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { blotatoKey } = JSON.parse(event.body || '{}');
  if (!blotatoKey) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'blotatoKey required' }),
    };
  }

  try {
    const r = await fetch('https://backend.blotato.com/v2/users/me/accounts', {
      headers: { 'blotato-api-key': blotatoKey },
    });
    const data = await r.json();
    return {
      statusCode: r.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
