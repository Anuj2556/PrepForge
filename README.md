# PrepForge — Free AI Interview Preparation Platform

A full-stack, original UI inspired by the feature scope of modern AI interview-prep products.

## Stack
- React + Vite + Tailwind CSS
- React Router
- Express
- Local JSON persistence (zero database setup)
- Browser Speech Recognition + Speech Synthesis for voice mocks
- Optional AI provider endpoint can be added later

## Run
### Server
```bash
cd server
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Features included
- Dashboard and onboarding
- Resume upload / text extraction fallback
- Job description input
- Resume readiness scoring
- Project deep-dive questions
- Branch technical Q&A
- Revision notes
- STAR story builder
- Tell-me-about-yourself scripts
- Soft-skills Q&A
- JD question predictor
- Company-pattern mock
- Interview round guide
- JD decoder
- Role-fit analyzer
- Resume gap analysis
- Skill-gap roadmap
- ATS scorer
- Salary negotiation guide
- Job / internship / government feeds using free demo data
- Aptitude practice with timer, scoring and history
- Voice HR mock
- Voice technical mock
- Attempt history
- Profile/settings
- Free-resource hub
- Responsive navigation and dark mode


## Gemini-powered voice interviewer

Create `server/.env` from `.env.example`:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

The key is used only by the Express server. The browser uses Web Speech Recognition for speech-to-text and Speech Synthesis for spoken output. Gemini evaluates answers and generates adaptive follow-up questions.
# PrepForge
