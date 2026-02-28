# BidAI Technical Documentation

## 1. System Overview
BidAI is a web platform for field monitoring and AI-assisted agronomy decisions.

Main modules:
- Frontend map and field workflows
- Backend AI/report APIs
- Satellite index overlays and weather context

## 2. Architecture

### Frontend
- Stack: React + Vite + Tailwind + Leaflet
- Key components:
  - `MapView.jsx`: field map, drawing, search, AI panel
  - `IndexViewer.jsx`: satellite index overlays
  - `AIReportPage.jsx`: full-screen AI reports
  - `ChibiAssistant.jsx`: conversational assistant widget

### Backend
- Stack: Node.js + Express
- API routes:
  - `POST /api/ai/field-report`
  - `POST /api/ai/season-compare`
  - `POST /api/ai/assistant`
  - `GET /api/health`

### AI Layer
- OpenAI Responses API integration in server services
- Fallback heuristics if OpenAI is unavailable
- JSON-schema validation for structured reports

## 3. Data Flow
1. User selects field and period.
2. Frontend sends normalized payload to backend.
3. Backend computes summary stats.
4. Backend requests AI response.
5. Report is validated and returned to UI.
6. Frontend renders and may cache per field+period.

## 4. Environment Variables
Required (server-side):
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)

Frontend/imagery:
- `VITE_SENTINEL_HUB_INSTANCE_ID`

Security note:
- Do not expose private keys with `VITE_` prefix in production.

## 4.1 Where to Get API Keys

### OpenAI (`OPENAI_API_KEY`)
1. Open platform: `https://platform.openai.com/`
2. Login to your account.
3. Go to API Keys page: `https://platform.openai.com/api-keys`
4. Create a new secret key and copy it once.
5. Put it into `.env`:
   - `OPENAI_API_KEY=your_key_here`

Notes:
- The key is server-side only.
- Do not commit real key values into GitHub.
- For demo/jury access, use temporary key with spending limits.

### Sentinel Hub (`VITE_SENTINEL_HUB_INSTANCE_ID`)
1. Open Dashboard: `https://apps.sentinel-hub.com/dashboard/`
2. Login and create/select configuration.
3. Copy `Instance ID`.
4. Put it into `.env`:
   - `VITE_SENTINEL_HUB_INSTANCE_ID=your_instance_id_here`

Notes:
- This value is used by frontend map index requests.
- Ensure your Sentinel Hub account/config has required data access.

## 5. Local Setup and Run
Prerequisites:
- Node.js 18+ (recommended 20+)
- npm

Steps:
1. Install dependencies:
`npm install`
2. Create `.env` in project root:
   - `OPENAI_API_KEY=...`
   - `OPENAI_MODEL=gpt-4o-mini` (optional)
   - `VITE_SENTINEL_HUB_INSTANCE_ID=...`
3. Start backend API:
`npm run dev:server`
4. Start frontend (new terminal):
`npm run dev`
5. Open local URL shown by Vite (usually `http://localhost:5173`).

Production build:
1. Build frontend:
`npm run build`
2. Preview build:
`npm run preview`

## 6. Key Features (MVP)
- Field polygon creation and management
- Satellite imagery and index overlays
- AI field report generation
- AI season comparison
- AI assistant widget

## 7. Testing
Current repo includes backend tests for report services and schemas in `server/*.test.js`.

Run:
`npm test`

## 8. Deployment Notes
- Frontend can be deployed on static hosting.
- Backend should run as separate service/API.
- Configure CORS/proxy and secure environment variables.

## 9. Known Constraints
- External API/network availability affects AI and imagery features.
- Quality of reports depends on completeness of index/weather data.
- Browser/proxy settings can impact map tile loading.
