# Account Research Intelligence

AI-powered value consultant tool that generates single-slide PowerPoint research briefs for any publicly listed company — sourced exclusively from annual reports, 10-K filings, and investor relations materials.

## Stack

- **Frontend** — React 18 + Vite
- **Backend** — Netlify Functions (serverless Node.js)
- **AI** — Claude Sonnet via Anthropic API + web search
- **PPTX** — PptxGenJS (client-side generation)
- **Deploy** — GitHub → Netlify (auto-deploy on push)

---

## Local development

### 1. Prerequisites
- Node.js 18+
- [Anthropic API key](https://console.anthropic.com/)
- Netlify CLI (installed via `npm install`)

### 2. Install
```bash
npm install
```

### 3. Set environment variable
```bash
cp .env.example .env
# Open .env → paste your ANTHROPIC_API_KEY
```

### 4. Run
```bash
npm run dev
# Opens at http://localhost:8888
```

---

## Deploy: GitHub → Netlify

### Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"

# GitHub CLI (easiest):
gh repo create account-research-app --public --source=. --push

# Or manually: create repo at github.com/new, then:
# git remote add origin https://github.com/YOUR_USERNAME/account-research-app.git
# git branch -M main
# git push -u origin main
```

### Connect to Netlify
1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Select **GitHub** → choose `account-research-app`
3. Build settings are auto-detected from `netlify.toml` — click **Deploy site**

### Add your API key
Netlify dashboard → **Site configuration → Environment variables → Add a variable**

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

Then: **Deploys → Trigger deploy → Deploy site**

✅ Live at `https://your-site.netlify.app`

---

Every `git push` to `main` triggers an automatic redeploy.

---

## Project structure

```
├── netlify/
│   └── functions/
│       └── research.js     ← Serverless function (Anthropic API, secure)
├── src/
│   ├── components/
│   │   ├── SlidePreview.jsx
│   │   └── SlidePreview.module.css
│   ├── App.jsx
│   ├── App.module.css
│   ├── pptxGenerator.js    ← Client-side PPTX generation
│   ├── main.jsx
│   └── index.css
├── index.html
├── netlify.toml            ← Build + routing config
├── vite.config.js
├── package.json
└── .env.example
```

## Security
- `ANTHROPIC_API_KEY` lives only in Netlify environment variables — never in the browser or repo
- `.env` is gitignored
