# Focusly — AI Productivity Assistant

A responsive web app with three connected AI tools: a **Smart Email Generator**, a **Meeting Notes Summarizer**, and an **AI Task Planner / Scheduler**, plus a dashboard.

## Tech stack
- React 19 + TypeScript, TanStack Start (routing + server functions), Vite
- Tailwind CSS v4 + shadcn/ui components
- Server functions (Node-style backend) call the AI gateway; API keys never reach the browser

## Setup & run
```bash
bun install        # or npm install
bun run dev        # or npm run dev  → http://localhost:8080
```

### AI configuration
The server reads `LOVABLE_API_KEY` from environment variables (inside `src/lib/ai.server.ts`, server-only).
- When the key is present, real AI responses are generated.
- When it is missing — or **Demo mode** is turned on in Settings — realistic mock responses are used so every feature still works.

## Project structure
```
src/
  routes/            pages: index (dashboard), email, meetings, tasks, schedule, settings, responsible-ai
  components/        sidebar, task dialog, shared UI (headers, empty/loading/error states)
  lib/
    ai.functions.ts  server functions (email, meeting summary, task prioritization)
    ai.server.ts     server-only AI gateway call
    mock-ai.ts       offline mock responses
    planner.ts       scoring + time-block scheduling
    store.tsx        app state persisted in localStorage
```

## How prioritization works
Tasks are ranked by AI (or a deterministic score in demo mode) using priority, deadline urgency and duration. The ranked list is then packed into your working hours for a daily or weekly (Mon–Fri) schedule.

## Responsible AI
AI-generated content may contain mistakes or omissions. Review and verify important information before sending emails, making decisions, or following generated schedules. Do not enter confidential or sensitive information.
