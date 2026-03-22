const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    return u.searchParams.get('v') || null;
  } catch { return null; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const body = JSON.parse(event.body || '{}');
  const { geminiKey, youtubeUrl } = body;
  const apiKey = geminiKey || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Gemini API key required. Add it in Settings.' }),
    };
  }

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid YouTube URL — could not extract video ID.' }),
    };
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                fileData: {
                  mimeType: 'video/*',
                  fileUri: `https://www.youtube.com/watch?v=${videoId}`,
                },
              },
              {
                text: 'Please extract the full spoken transcript of this video. Return only the transcript text — no timestamps, no speaker labels, just the natural spoken content paragraph by paragraph.',
              },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) {
      return {
        statusCode: r.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.error?.message || 'Gemini error' }),
      };
    }
    const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, transcript, videoId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
