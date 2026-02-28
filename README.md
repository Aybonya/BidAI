# BidAI

BidAI is an MVP web application for field monitoring, satellite index visualization, and AI-assisted agronomy reporting.

## Repository Contents

- `src/`, `server/` - MVP source code (frontend + backend)
- `pitch-deck/PITCH_DECK.md` - pitch deck (15-slide structure)
- `docs/TECHNICAL_DOCUMENTATION.md` - technical documentation

## Quick Start

1. Install dependencies:
   `npm install`
2. Run frontend:
   `npm run dev`
3. Run backend:
   `npm run dev:server`

## Environment Variables

Create `.env` with:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
- `VITE_SENTINEL_HUB_INSTANCE_ID`

## Notes

- `.env` is ignored by git.
- AI keys must stay server-side for production.
