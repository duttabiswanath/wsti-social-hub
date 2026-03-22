<div align="center">

<table width="100%"><tr><td align="center" bgcolor="#061D2E" style="padding:28px 0 24px 0;">
<img src="wsti-logo.png" alt="Western Sydney Tech Innovators Logo" width="340"/>
</td></tr></table>

# 🚀 WSTI Social Media Hub

**AI-powered social media command centre for Western Sydney Tech Innovators**

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR_BADGE_ID/deploy-status)](https://app.netlify.com/sites/wsti-social-hub/deploys)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini-2.5%20Pro-4285F4?logo=google&logoColor=white)
![Netlify](https://img.shields.io/badge/Deployed%20on-Netlify-00C7B7?logo=netlify&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-emerald?color=18CB96)
![Non-Profit](https://img.shields.io/badge/Non--Profit-Western%20Sydney-061D2E?color=061D2E)

*Transforming event moments into polished, multi-platform social content — powered by Google Gemini AI.*

[🌐 Live Demo](https://wsti-social-hub.netlify.app) · [📖 Setup Guide](#-getting-started) · [🐛 Report a Bug](https://github.com/duttabiswanath/wsti-social-hub/issues) · [💡 Request Feature](https://github.com/duttabiswanath/wsti-social-hub/issues)

</div>

---

## 📸 What is WSTI Social Media Hub?

The **WSTI Social Media Hub** is a custom-built, browser-based dashboard that helps the **Western Sydney Tech Innovators** volunteer team turn event highlights into ready-to-post social media content — in seconds.

Instead of manually writing captions, resizing graphics, and copying text across platforms, volunteers simply paste a YouTube link or write a post idea. The AI takes care of the rest: extracting transcripts, generating on-brand captions, creating AI imagery, and posting directly to LinkedIn, Instagram, Facebook, and X/Twitter via **Blotato**.

> 💡 Built with love by WSTI volunteers. Zero cost to run — just bring your own API keys.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📝 **AI Post Generator** | Write social posts for any platform using Gemini 2.5 Pro with WSTI's brand voice |
| 🎬 **YouTube Recap** | Paste a YouTube link → get a full transcript + polished event recap post, automatically |
| 🎨 **AI Graphic Generator** | Generate branded event imagery using Google's Nano Banana model (Gemini image generation) |
| 🚀 **One-Click Publishing** | Post directly to LinkedIn, Instagram, Facebook, and X/Twitter via Blotato |
| ⚙️ **In-App Settings** | Manage API keys, platform account IDs, and preferences — all stored securely in your browser |
| 🔐 **Protected Login** | Single-user authentication keeps the dashboard private |
| 🩺 **Health Check** | Live status indicator showing API connectivity |
| 💻 **Local + Cloud** | Run locally for full features (incl. Google Drive), or deploy to Netlify for anywhere access |

---

## 🛠️ Tech Stack

### Frontend
- 🌐 **Vanilla HTML/CSS/JS** — zero framework dependencies, fast and lightweight
- 🎨 **WSTI Brand Colours** — Navy `#061D2E` · Emerald `#18CB96`
- 🔒 **localStorage** — settings and session data stored client-side (no database needed)

### AI & APIs
- 🤖 **Google Gemini 2.5 Pro** — post generation, transcript extraction, event recaps
- 🎨 **Nano Banana** (`gemini-3.1-flash-image-preview`) — AI image generation, Google's latest native image model
- 📣 **Blotato API** — multi-platform social media publishing

### Backend
- ⚡ **Netlify Functions** — serverless Node.js functions (no server to maintain!)
- 🖥️ **Express.js** — local development server with the same API surface
- 📁 **Google Drive API** — media uploads (local dev only)

---

## 📋 Prerequisites

Before you start, make sure you have:

- ✅ [Node.js 18+](https://nodejs.org/) installed
- ✅ A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier works!)
- ✅ A [Blotato account](https://my.blotato.com) with connected social accounts
- ✅ Your Blotato Account IDs for each platform you want to post to

---

## 🚀 Getting Started

### Option A — Netlify (Recommended for Teams)

> No installation required. One-click deploy directly from GitHub.

1. **Fork or clone** this repo to your own GitHub account
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
3. Connect your **GitHub** account and select **`wsti-social-hub`**
4. Leave all build settings as-is (they're pre-configured in `netlify.toml`)
5. Click **Deploy site** 🎉

> The app is live in ~60 seconds. No environment variables needed — API keys are entered inside the app.

**Optional:** Add environment variable fallbacks in Netlify → **Site settings** → **Environment variables**:
```
GEMINI_API_KEY=your_key_here
BLOTATO_API_KEY=your_key_here
```

---

### Option B — Local Development

Perfect for development, testing, or if you want Google Drive integration.

#### 1. Clone the repo

```bash
git clone https://github.com/duttabiswanath/wsti-social-hub.git
cd wsti-social-hub
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```env
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-pro
IMAGEN_MODEL=gemini-3.1-flash-image-preview
BLOTATO_API_KEY=blotato_...
```

#### 4. (Optional) Set up Google Drive

> Only needed if you want to save uploaded media to Google Drive.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google Drive API**
3. Create **OAuth 2.0 credentials** → Download as `credentials.json`
4. Place `credentials.json` in the project root
5. Run the app once and follow the auth link in the terminal

#### 5. Start the server

```bash
npm start
# or for hot-reload during development:
npm run dev
```

#### 6. Open the dashboard

```
http://localhost:3000
```

---

## 🔐 First Login

After opening the app (local or Netlify), you'll see a login screen.

> Credentials are managed by your WSTI admin. Contact the team lead if you need access.

Once logged in, head to ⚙️ **Settings** to enter your API keys and Blotato account IDs.

---

## 📁 Project Structure

```
wsti-social-hub/
│
├── 📄 wsti-dashboard.html          # Main app (single-page dashboard)
├── 🖼️  wsti-logo.png               # WSTI brand logo
│
├── 🖥️  server.js                   # Express server (local development)
├── 📦 package.json
├── 🔧 netlify.toml                 # Netlify build & redirect config
├── 🔒 .env.example                 # Environment variable template
├── 🚫 .gitignore
│
└── ⚡ netlify/
    └── functions/
        ├── generate.js             # POST /api/generate → AI post generation
        ├── generate-recap.js       # POST /api/generate-recap → Event recap
        ├── generate-graphic-ai.js  # POST /api/generate-graphic-ai → AI images
        ├── transcript.js           # POST /api/transcript → YouTube transcript
        ├── post.js                 # POST /api/post → Publish via Blotato
        ├── accounts.js             # POST /api/accounts → Blotato account list
        └── health.js               # GET  /api/health → Status check
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ⚠️ Optional* | Google Gemini API key — [get one free](https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | ❌ No | Text model. Default: `gemini-2.5-pro` |
| `IMAGEN_MODEL` | ❌ No | Image model. Default: `gemini-3.1-flash-image-preview` |
| `BLOTATO_API_KEY` | ⚠️ Optional* | Blotato API key — [get from your dashboard](https://my.blotato.com) |
| `BLOTATO_LINKEDIN_ACCOUNT_ID` | ❌ No | Your LinkedIn account ID in Blotato |
| `BLOTATO_INSTAGRAM_ACCOUNT_ID` | ❌ No | Your Instagram account ID in Blotato |
| `BLOTATO_FACEBOOK_ACCOUNT_ID` | ❌ No | Your Facebook account ID in Blotato |
| `BLOTATO_TWITTER_ACCOUNT_ID` | ❌ No | Your X/Twitter account ID in Blotato |
| `GOOGLE_DRIVE_FOLDER_ID` | ❌ No | Google Drive folder ID for media uploads |
| `PORT` | ❌ No | Local server port. Default: `3000` |

> ⚠️ *Optional if using Netlify — keys can be entered inside the app's Settings panel instead.

---

## 🤖 AI Models Reference

| Model | Codename | Purpose |
|---|---|---|
| `gemini-2.5-pro` | — | Writing social posts, event recaps, transcript extraction |
| `gemini-3.1-flash-image-preview` | 🍌 Nano Banana | Generating AI background imagery for event graphics |

---

## 🌐 Netlify Deployment Notes

| Feature | Netlify (Cloud) | Local (Express) |
|---|---|---|
| AI Post Generation | ✅ Full support | ✅ Full support |
| YouTube Transcripts | ✅ Full support | ✅ Full support |
| AI Image Generation | ✅ Full support | ✅ Full support |
| Blotato Publishing | ✅ Full support | ✅ Full support |
| Google Drive Upload | ❌ Not supported | ✅ Full support |

> Google Drive requires OAuth token files that can't be stored on serverless platforms. All other features work identically on Netlify.

---

## 🐞 Troubleshooting

<details>
<summary><b>🔴 "Transcript failed" error on YouTube videos</b></summary>

- Make sure the video is **publicly accessible** (not private or unlisted)
- Some videos have **auto-captions disabled** by the creator — try a different video
- Long videos (>1 hour) may time out — Netlify functions have a 10-second limit on the free plan

</details>

<details>
<summary><b>🔴 "Image generation failed" error</b></summary>

- Verify your Gemini API key has access to the **`gemini-3.1-flash-image-preview`** model
- This model may require **Gemini API billing** to be enabled on your Google Cloud project
- Check the browser console for the full error message

</details>

<details>
<summary><b>🔴 Posts not publishing to social platforms</b></summary>

- Confirm your **Blotato Account IDs** are correctly entered in Settings
- Make sure the social accounts in Blotato are **connected and active** (not expired)
- Check that your **Blotato API key** is valid and has posting permissions

</details>

<details>
<summary><b>🟡 Health check shows API keys missing</b></summary>

- Go to ⚙️ **Settings** in the dashboard
- Enter your **Gemini API key** and **Blotato API key**
- Click **Save Settings** — keys are stored in your browser's localStorage

</details>

---

## 🤝 Contributing

WSTI Social Media Hub is maintained by WSTI volunteers. Contributions are welcome!

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

---

## 🏢 About Western Sydney Tech Innovators

**Western Sydney Tech Innovators (WSTI)** is a non-profit AI innovation hub and incubator based in Western Sydney, Australia. We connect founders, developers, and tech enthusiasts to build the future of technology in our community.

🌐 [Website](https://westernsydneytechinnovators.org) · 💼 [LinkedIn](https://linkedin.com/company/western-sydney-tech-innovators) · 📸 [Instagram](https://instagram.com/wstechinnovators)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by WSTI Volunteers · Western Sydney, Australia 🇦🇺

*Empowering communities through technology.*

</div>
