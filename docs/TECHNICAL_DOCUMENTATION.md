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

## 5. Key Features (MVP)
- Field polygon creation and management
- Satellite imagery and index overlays
- AI field report generation
- AI season comparison
- AI assistant widget

## 6. Testing
Current repo includes backend tests for report services and schemas in `server/*.test.js`.

Run:
`npm test`

## 7. Deployment Notes
- Frontend can be deployed on static hosting.
- Backend should run as separate service/API.
- Configure CORS/proxy and secure environment variables.

## 8. Known Constraints
- External API/network availability affects AI and imagery features.
- Quality of reports depends on completeness of index/weather data.
- Browser/proxy settings can impact map tile loading.
