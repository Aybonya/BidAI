# BidAI

BidAI is an MVP web application for field monitoring, satellite index visualization, and AI-assisted agronomy reporting.

## Repository Contents

- `src/`, `server/` - MVP source code (frontend + backend)
- `pitch-deck/*.pdf` - pitch deck (PDF presentation)
- `docs/TECHNICAL_DOCUMENTATION.md` - technical documentation

## Quick Start

1. Install dependencies:
   `npm install`
2. Create env file from template:
   `cp .env.example .env`
   On Windows PowerShell:
   `Copy-Item .env.example .env`
3. Fill values in `.env` (`OPENAI_API_KEY`, `VITE_SENTINEL_HUB_INSTANCE_ID`, etc.)
4. Run backend:
   `npm run dev:server`
5. Run frontend:
   `npm run dev`

## Environment Variables

Create `.env` with:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
- `VITE_SENTINEL_HUB_INSTANCE_ID`

## Notes

- `.env` is ignored by git.
- AI keys must stay server-side for production.
