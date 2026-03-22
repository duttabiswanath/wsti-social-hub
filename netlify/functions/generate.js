const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const body = JSON.parse(event.body || '{}');
  const { geminiKey, title, date, time, location, speaker, description, meetupUrl } = body;
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
- Mission: Make technology accessible and exciting for everyone, from curious beginners to seasoned professionals.
- Values: Inclusive, friendly, hands-on, encouraging. We celebrate curiosity, not credentials.
- Audience: Startup founders, small business owners, job-seekers upskilling in AI, students, healthcare workers, and anyone new to tech.
- Website: https://westernsydneytechinnovators.org/

EVENT DETAILS:
Title: ${title}
Date: ${date}${time ? ' at ' + time : ''}
Location: ${location || 'Western Sydney'}
${speaker ? 'Speaker: ' + speaker : ''}
Description: ${(description || '').substring(0, 1200)}
${meetupUrl ? 'RSVP URL: ' + meetupUrl : ''}

Write 4 platform-specific posts on behalf of WSTI. Goal: attract curious locals — including people with no tech background — to attend and discover what technology can do for them.

IMPORTANT RULES:
- Tone: Friendly, warm, approachable, enthusiastic — never jargon-heavy or intimidating.
- Always make the tech topic feel relevant to everyday life (jobs, business, health, creativity).
- Hashtags for Instagram must be SPECIFIC to this event content — derive them from the title and description.

Return ONLY a valid JSON object (no markdown fences, no backticks, no extra text) with exactly these four keys:
{
  "facebook": "150-250 words. Warm, conversational, community-focused. 3-5 relevant emojis. Explain what attendees will gain. Note it is open to all skill levels. Include date, location${meetupUrl ? ', RSVP link' : ''}. Sign off: — Western Sydney Tech Innovators 🚀",
  "instagram": "80-120 words. Punchy, energetic. No URLs. End with 12-18 hashtags: 8-12 event-specific tags derived from this event topic + always append #WesternSydney #TechCommunity #WSTI #TechForAll #WesternSydneyTech",
  "linkedin": "200-300 words. Professional yet warm. Hook about why this tech topic matters now. Who should attend and what they will learn. No prior tech knowledge required.${meetupUrl ? ' RSVP link and CTA.' : ''} Mention Western Sydney Tech Innovators and website.",
  "twitter": "Under 270 characters. One punchy hook about this event + date + location + 2-3 relevant hashtags.${meetupUrl ? ' Include RSVP link.' : ''}"
}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 2048 },
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
