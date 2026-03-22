const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const body = JSON.parse(event.body || '{}');
  const { geminiKey, transcript, title, date, location, speaker, youtubeUrl } = body;
  const apiKey = geminiKey || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Gemini API key required. Add it in Settings.' }),
    };
  }

  const prompt = `You are the social media manager for Western Sydney Tech Innovators (WSTI) — a welcoming community in Western Sydney, Australia that helps people from ALL backgrounds explore and benefit from AI, automation, VR/AR, and emerging technology.

About WSTI:
- Mission: Make technology accessible and exciting for everyone.
- Values: Inclusive, friendly, hands-on, encouraging. We celebrate curiosity, not credentials.
- Website: https://westernsydneytechinnovators.org/

EVENT RECAP DETAILS:
Title: ${title}
${date ? 'Date: ' + date : ''}
${location ? 'Location: ' + location : ''}
${speaker ? 'Speaker: ' + speaker : ''}
${youtubeUrl ? 'Recording URL: ' + youtubeUrl : ''}

TALK TRANSCRIPT (use this to extract real insights and quotes):
${(transcript || '').substring(0, 3000)}

This event has ALREADY HAPPENED. Write 4 post-event recap posts for WSTI based on the actual talk content.

IMPORTANT RULES:
- Tone: Grateful, celebratory, reflective. "Thanks to everyone who joined us!", "What an incredible session!"
- Extract 2-3 genuine insights or notable moments from the transcript to make posts feel authentic — not generic.
- Include the recording link where instructed.
- Hashtags for Instagram must be SPECIFIC to the actual content covered in this talk.

Return ONLY a valid JSON object (no markdown fences, no backticks, no extra text) with exactly these four keys:
{
  "facebook": "150-250 words. Warm community post celebrating the event. Reference 2-3 specific insights from the talk. Include recording link if provided. Sign off: — Western Sydney Tech Innovators 🚀",
  "instagram": "80-120 words. Energetic recap. Quote one genuine insight from the transcript. Include recording link. End with 12-18 hashtags: 8-12 event-specific + always append #WesternSydney #TechCommunity #WSTI #TechForAll #WesternSydneyTech",
  "linkedin": "200-300 words. Professional recap. Key learnings and insights from the actual talk. Tag speaker if name is known. Include recording link and CTA. Mention Western Sydney Tech Innovators and website.",
  "twitter": "Under 270 characters. Punchy takeaway or quote from the talk. Include recording link if provided. 2-3 hashtags max."
}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 3072 },
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
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const posts = JSON.parse(cleaned);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, posts }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
