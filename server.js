require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');
const fs   = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });

// ── Config ────────────────────────────────────────────────────────────────────
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY   || '';
const GEMINI_MODEL     = process.env.GEMINI_MODEL     || 'gemini-2.5-pro';
// Nano Banana = Google's codename for native Gemini image generation
// gemini-3.1-flash-image-preview = latest recommended (uses generateContent, not predict)
const IMAGEN_MODEL     = process.env.IMAGEN_MODEL     || 'gemini-3.1-flash-image-preview';
const BLOTATO_API_KEY  = process.env.BLOTATO_API_KEY  || '';
const BLOTATO_BASE     = 'https://backend.blotato.com';
const DRIVE_FOLDER_ID  = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH       = path.join(__dirname, 'token.json');
const SCOPES           = ['https://www.googleapis.com/auth/drive.file'];

// ── Google Drive Auth ─────────────────────────────────────────────────────────
function getOAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) return null;
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } =
    creds.installed || creds.web;
  return new google.auth.OAuth2(
    client_id, client_secret,
    'http://localhost:3000/api/auth/google/callback'
  );
}

async function getDriveAuth() {
  const oAuth2Client = getOAuthClient();
  if (!oAuth2Client) throw new Error('credentials.json not found');
  if (!fs.existsSync(TOKEN_PATH))
    throw new Error('Google Drive not authenticated — visit /api/auth/google');
  oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
  return oAuth2Client;
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:      'ok',
    gemini:      !!GEMINI_API_KEY,
    blotato:     !!BLOTATO_API_KEY,
    drive:       fs.existsSync(TOKEN_PATH),
    driveFolder: !!DRIVE_FOLDER_ID,
    model:       GEMINI_MODEL,
  });
});

// ── Blotato: list accounts ────────────────────────────────────────────────────
app.get('/api/accounts', async (_req, res) => {
  try {
    const r = await fetch(`${BLOTATO_BASE}/v2/users/me/accounts`, {
      headers: { 'blotato-api-key': BLOTATO_API_KEY },
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Gemini: generate platform posts ──────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { title, date, time, location, speaker, description, meetupUrl } = req.body;

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
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Gemini error' });

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const posts = JSON.parse(cleaned);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Google Drive: upload media ────────────────────────────────────────────────
app.post('/api/upload-media', upload.single('file'), async (req, res) => {
  try {
    const auth  = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    const meta = {
      name:    req.file.originalname,
      parents: DRIVE_FOLDER_ID ? [DRIVE_FOLDER_ID] : [],
    };
    const media = {
      mimeType: req.file.mimetype,
      body:     Readable.from(req.file.buffer),
    };
    const file = await drive.files.create({ resource: meta, media, fields: 'id,name,mimeType' });

    // Make the file publicly readable so Blotato can download it
    await drive.permissions.create({
      fileId:   file.data.id,
      resource: { role: 'reader', type: 'anyone' },
    });

    const url = file.data.mimeType.startsWith('video/')
      ? `https://drive.google.com/uc?id=${file.data.id}&export=download`
      : `https://drive.google.com/thumbnail?id=${file.data.id}&sz=w1200`;

    res.json({ success: true, fileId: file.data.id, url, name: file.data.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Blotato: post to social media ─────────────────────────────────────────────
app.post('/api/post', async (req, res) => {
  // platforms: [{ platform, accountId, text, mediaUrls, facebookPageId? }]
  const { platforms } = req.body;
  const results = [];

  for (const p of platforms) {
    try {
      const body = {
        post: {
          target:    { targetType: p.platform },
          content:   { platform: p.platform, text: p.text, mediaUrls: p.mediaUrls || [] },
          accountId: p.accountId,
        },
      };
      if (p.platform === 'facebook' && p.facebookPageId) {
        body.post.target.pageId = p.facebookPageId;
      }

      const r = await fetch(`${BLOTATO_BASE}/v2/posts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'blotato-api-key': BLOTATO_API_KEY },
        body:    JSON.stringify(body),
      });
      const data = await r.json();
      results.push({ platform: p.platform, success: r.ok, data });
    } catch (err) {
      results.push({ platform: p.platform, success: false, error: err.message });
    }
  }
  res.json({ results });
});

// ── Nano Banana: AI-generated WSTI branded background ─────────────────
// Uses Gemini native image generation (gemini-3.1-flash-image-preview)
// via generateContent — NOT the Imagen predict endpoint
app.post('/api/generate-graphic-ai', async (req, res) => {
  const { title, date, speaker } = req.body;

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
    // Nano Banana models use generateContent (not predict like Imagen 4)
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Nano Banana error' });

    // Response: candidates[0].content.parts[0].inlineData.data (base64)
    const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part) return res.status(500).json({ error: 'No image returned from Nano Banana model' });

    res.json({
      success:     true,
      imageBase64: part.inlineData.data,
      mimeType:    part.inlineData.mimeType || 'image/png',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── YouTube: extract video ID helper ─────────────────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    return u.searchParams.get('v') || null;
  } catch { return null; }
}

// ── YouTube transcript via Gemini ──────────────────────────────────────
app.post('/api/transcript', async (req, res) => {
  const { youtubeUrl } = req.body;
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL — could not extract video ID.' });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contents: [{
            parts: [
              {
                fileData: {
                  mimeType: 'video/*',
                  fileUri:  `https://www.youtube.com/watch?v=${videoId}`,
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
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Gemini error' });
    const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ success: true, transcript, videoId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Gemini: generate post-event recap posts from transcript ───────────
app.post('/api/generate-recap', async (req, res) => {
  const { transcript, title, date, location, speaker, youtubeUrl } = req.body;

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
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 3072 },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Gemini error' });
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const posts   = JSON.parse(cleaned);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Google OAuth flow ─────────────────────────────────────────────────────────
app.get('/api/auth/google', (_req, res) => {
  const client = getOAuthClient();
  if (!client) return res.status(500).send('credentials.json not found');
  const url = client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const client = getOAuthClient();
  if (!client) return res.status(500).send('credentials.json not found');
  try {
    const { tokens } = await client.getToken(req.query.code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:80px"><h2 style="color:#1a3a6b">✅ Google Drive connected!</h2><p>You can close this tab and return to the dashboard.</p><script>setTimeout(()=>window.close(),3000)</script></body></html>');
  } catch (err) {
    res.status(500).send('Auth failed: ' + err.message);
  }
});

// ── Serve dashboard ───────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'wsti-dashboard.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🚀 WSTI Social Dashboard → http://localhost:${PORT}\n`));
