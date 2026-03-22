const BLOTATO_BASE = 'https://backend.blotato.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const body = JSON.parse(event.body || '{}');
  const { blotatoKey, platforms } = body;
  const apiKey = blotatoKey || process.env.BLOTATO_API_KEY || '';

  if (!apiKey) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Blotato API key required. Add it in Settings.' }),
    };
  }

  const results = [];

  for (const p of (platforms || [])) {
    try {
      const postBody = {
        post: {
          target:    { targetType: p.platform },
          content:   { platform: p.platform, text: p.text, mediaUrls: p.mediaUrls || [] },
          accountId: p.accountId,
        },
      };
      if (p.platform === 'facebook' && p.facebookPageId) {
        postBody.post.target.pageId = p.facebookPageId;
      }

      const r = await fetch(`${BLOTATO_BASE}/v2/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'blotato-api-key': apiKey },
        body: JSON.stringify(postBody),
      });
      const data = await r.json();
      results.push({ platform: p.platform, success: r.ok, data });
    } catch (err) {
      results.push({ platform: p.platform, success: false, error: err.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results }),
  };
};
