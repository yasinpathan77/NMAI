# Clinical Documentation Assistant

AI-powered medical transcript analysis system that generates structured clinical documentation using Google's Gemini models for Australian healthcare providers.

## Features

- **SOAP Note Generation** - Converts medical transcripts into structured clinical notes
- **ICD-10-AM Coding** - Automatic diagnosis code suggestions
- **MBS Billing Codes** - Medicare Benefits Schedule item recommendations
- **Emergency Detection** - Built-in guardrails for critical medical situations
- **Speaker Identification** - Distinguishes between doctor, patient, and other participants
- **Session History** - Automatic storage with 24-hour retention

## Prerequisites

- Node.js v18+
- npm v8+
- Google Gemini API key (free at [Google AI Studio](https://makersuite.google.com/app/apikey))

## Installation

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd clinical

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. Configure environment:
```bash
cd ../backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

## Running the Application

Start both servers in separate terminals:

**Backend** (port 4000):
```bash
cd backend
npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## Tech Stack

**Frontend**: React 18, TypeScript, Vite, Chakra UI
**Backend**: Node.js, TypeScript, Fastify, SQLite, Google Gemini AI

## API Endpoints

- `POST /analyze` - Process medical transcript
- `POST /upload` - Upload transcript file
- `GET /health` - Service health check
- `GET /session/last` - Get last analysis
- `GET /session/:id` - Get specific session
- `GET /sessions` - List all sessions

## Project Structure

```
clinical/
├── frontend/          # React application
│   └── src/
│       ├── components/
│       └── services/
├── backend/           # Node.js server
│   └── src/
│       ├── services/
│       └── schemas/
└── shared/           # Shared TypeScript types
```

## Important Notes

- This is an assistance tool - all outputs require clinical review
- Not a medical device or diagnostic tool
- Designed for Australian healthcare (ICD-10-AM, MBS)
- Sessions automatically expire after 24 hours

## License

[Your license here]