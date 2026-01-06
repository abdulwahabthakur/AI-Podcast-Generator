# Environment Variables Setup

Create a `.env` file in the `backend` directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# Python Service URL (the HTTP wrapper for the research service)
PYTHON_SERVICE_URL=http://localhost:8000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Server Port
PORT=3001

# Node Environment
NODE_ENV=development
```

## How to Get Supabase Credentials

1. Go to https://supabase.com and create a new project
2. Go to Project Settings > API
3. Copy the "Project URL" as `SUPABASE_URL`
4. Copy the "service_role" key (not the anon key) as `SUPABASE_SERVICE_KEY`
5. Run the SQL schema from `database/schema.sql` in the Supabase SQL Editor

## OpenAI API Key

Add your OpenAI API key to the `backend/.env` file:

```env
OPENAI_API_KEY=sk-your-key-here
```

The Python service will automatically read it from the .env file.

## ElevenLabs API Key (for Audio Generation)

Add your ElevenLabs API key to the `backend/.env` file:

```env
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
```

Get your API key from: https://elevenlabs.io → Profile → API Key

Optional: You can also customize voice IDs:

```env
ELEVENLABS_HOST_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_GUEST_VOICE_ID=pNInz6obpgDQGcFmaJgB
```

Find available voices at: https://elevenlabs.io/app/voice-library
