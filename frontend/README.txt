GovAI frontend
==============

Vite 5 + React 18 + TypeScript. Talks to the existing GovAI backend through /api/v1.
This folder is the complete frontend; the backend is not included.

IMPORTANT: KEEP THIS FOLDER INSIDE YOUR GOVAI REPOSITORY, NEXT TO "shared/".
  The code imports its TypeScript types from ../shared/types.ts (the same shared/ folder the
  backend uses), exactly as the original project did. Expected layout:
      GovAI/
        backend/
        shared/          <- must exist, unchanged
        frontend/        <- this folder (replace your existing frontend/ with it)
  If you extract the ZIP somewhere else, "npx tsc" and "npm run build" will fail to find the
  shared types.

REQUIREMENTS
  Node.js 18 or newer, npm 9 or newer.

INSTALL
  npm install            (use "npm ci" for an exact install from package-lock.json)

RUN LOCALLY
  1. Start the GovAI backend first (it must listen on http://localhost:5000).
  2. npm run dev
  3. Open http://localhost:5173

  In development, visiting /app signs in the demo student automatically ("student_demo_1").
  This convenience exists only in dev builds. It does not exist in production builds.

API
  All requests go to /api/v1. During "npm run dev", Vite proxies /api to
  http://localhost:5000 (see vite.config.ts). Change the proxy target there if your
  backend runs elsewhere. No API URL is hard-coded in the source.

ENVIRONMENT VARIABLES  (see .env.example)
  VITE_GOOGLE_CLIENT_ID   Optional. Enables "Continue with Google" on /signin. Must match the
                          backend's GOOGLE_CLIENT_ID. Without it, a production build shows a
                          notice on /signin that sign-in is not configured.
  Copy .env.example to .env.local to set it. Never commit real values.

CHECK AND BUILD
  npx tsc --noEmit       type-check
  npm run build          type-check + production build into dist/
  npm run preview        serve the production build locally on http://localhost:4173

ROUTES
  /                      public landing page
  /signin                sign-in
  /app                   dashboard
  /app/discover          scheme discovery
  /app/matches           personalized recommendations
  /app/compare           comparison
  /app/assistant         AI advisor
  /app/saved             saved schemes
  /app/applications      application tracker
  /app/reminders         reminders
  /app/profile           profile and preferences
  Any page can open a scheme with ?scheme=<id>, e.g. /app/discover?scheme=<id>.

DEPLOYING
  The app uses browser history routing. Configure your host to serve index.html for every
  path (SPA fallback) and to forward /api to the backend, or deep links and refreshes will 404.
