# Deployment

## Vercel (Recommended)

The app is a standard Next.js project — Vercel detects it automatically.

### Steps

1. Push the repository to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com](https://vercel.com) → **Add New Project**.
3. Import the repository. Vercel auto-detects Next.js.
4. No environment variables are required — all processing is client-side.
5. Click **Deploy**.

That's it. The app will be live at `https://your-project.vercel.app`.

### Build settings (Vercel defaults — no changes needed)

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build command | `next build` |
| Output directory | `.next` |
| Install command | `npm install` |

---

## Local Development

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

Camera access requires **HTTPS or localhost**. The dev server on `localhost:3000` satisfies this.

---

## Production Build (local verification)

```bash
npm run build      # type-checks + compiles
npm run start      # serves the production build on :3000
```

---

## MediaPipe WASM Assets

The MediaPipe model (`pose_landmarker_lite`) and its WASM runtime are loaded at runtime from the `@mediapipe/tasks-vision` CDN URL defined in `src/lib/mediapipe.ts`:

```
https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@<version>/wasm
```

This keeps the deployment bundle small (the WASM files are ~8 MB and are cached by the browser after first load).

**No CDN changes are needed for Vercel deployment.**

---

## Environment Variables

### Required for Step-by-Step Instructions

If you want to use the LLM-powered step-by-step instructions feature:

1. Get an API key from [OpenRouter](https://openrouter.ai)
2. On Vercel: Go to **Settings** → **Environment Variables**
3. Add:
   ```
   OPENROUTER_API_KEY=sk-or-your-key-here
   ```

The key is server-side only (never exposed to the browser).

### Local Development

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
# Edit .env.local and add your OpenRouter API key
```

---

## Security Headers

Security headers (CSP, X-Frame-Options, Permissions-Policy, etc.) are configured in `next.config.ts` and applied automatically by Vercel.

The `Permissions-Policy` header limits camera access to the app's own origin:

```
Permissions-Policy: camera=(self), microphone=(), geolocation=()
```

---

## Custom Domain

In your Vercel project settings → **Domains**, add your custom domain and follow the DNS instructions.
