// Nano Banana (gemini-3.1-flash-image-preview) — Google's native Gemini image generation
// Uses generateContent with responseModalities: IMAGE (NOT the Imagen predict endpoint)
const IMAGEN_MODEL = process.env.IMAGEN_MODEL || 'gemini-3.1-flash-image-preview';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const body = JSON.parse(event.body || '{}');
  const { geminiKey, title, date, speaker } = body;
  const apiKey = geminiKey || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Gemini API key required. Add it in Settings.' }),
    };
  }

  const prompt = [
    'Dark navy blue technology event banner background for Western Sydney Tech Innovators (WSTI).',
    'Deep navy (#061D2E) dominant background color.',
    'Subtle abstract geometric patterns — faint circuit board lines, hexagon grids, dot matrices.',
    'Glowing emerald and teal green accent elements, light streaks, and soft bokeh (color: #18CB96).',
    'Modern, clean, professional tech aesthetic. Futuristic but approachable.',
    'Soft radial glow in the bottom-right corner in emerald green.',
    'A thin bright green horizontal stripe at the very bottom edge of the image.',
    'NO text, no words, no letters, no logos — pure abstract background only.',
    'Landscape 16:9 aspect ratio, suitable for a social media event card.',
  ].join(' ');

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) {
      return {
        statusCode: r.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.error?.message || 'Nano Banana error' }),
      };
    }

    // Response: candidates[0].content.parts[0].inlineData.data (base64)
    const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No image returned from Nano Banana model' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
