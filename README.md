# AI Podcast Generator 🎙️

A full-stack web application that generates AI-powered podcast episodes with realistic two-person conversations. Enter a topic, and the app researches it, writes a natural dialogue script, and converts it to audio using text-to-speech.

## Features

- 🤖 **AI Research & Script Writing** - Uses OpenAI GPT-4o Mini to research topics and generate natural conversations
- 🎧 **Voice Generation** - Converts scripts to audio using ElevenLabs text-to-speech
- 👥 **Natural Dialogue** - Creates realistic back-and-forth between Host and Guest
- 🎨 **Multiple Styles** - Conversational, Documentary, Investigative, Educational, Storytelling
- 🔐 **User Authentication** - Powered by Supabase Auth
- 💾 **Script History** - Save and revisit your generated podcasts

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| AI/LLM | OpenAI GPT-4o Mini |
| Text-to-Speech | ElevenLabs |
| Research Service | Python (AsyncOpenAI) |

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth & error handling
│   │   └── services/        # ElevenLabs & Python integration
│   ├── database/            # SQL schema
│   ├── Podcast_info_researcher.py   # AI research & script generation
│   └── python_service_server.py     # HTTP wrapper for Python service
│
└── frontend/
    ├── src/
    │   ├── pages/           # Landing, Generator, History
    │   ├── components/      # Navbar, etc.
    │   └── contexts/        # Auth context
    └── public/
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Supabase account (free tier works)
- OpenAI API key
- ElevenLabs API key

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL from `backend/database/schema.sql` in the SQL Editor
3. Copy your Project URL, Anon Key, and Service Role Key

### 3. Set Up Environment Variables

**Backend (`backend/.env`):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
PYTHON_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
PORT=3001
```

**Frontend (`frontend/.env`):**
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_URL=http://localhost:3001
```

### 4. Run the Application

Open 3 terminals:

```bash
# Terminal 1: Python research service
cd backend
python python_service_server.py

# Terminal 2: Node.js backend
cd backend
npm run dev

# Terminal 3: React frontend
cd frontend
npm start
```

### 5. Use the App

1. Open http://localhost:3000
2. Sign up / Sign in
3. Enter a topic (e.g., "The history of coffee")
4. Select duration and style
5. Click **Generate Podcast**
6. Listen to your AI-generated episode! 🎧

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-research` | Generate script from topic |
| POST | `/api/generate-audio` | Convert script to audio |
| GET | `/api/scripts` | Get user's saved scripts |
| GET | `/api/scripts/:id` | Get specific script |
| DELETE | `/api/scripts/:id` | Delete a script |

## License

ISC
