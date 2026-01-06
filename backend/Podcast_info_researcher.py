import os
import json
import base64
import asyncio
from typing import TypedDict, Optional, List
from datetime import datetime, timedelta
from openai import AsyncOpenAI

# ----- Type Definitions -----
class ResearchRequest(TypedDict):
    topic: str
    durationMinutes: int
    style: Optional[str]
    language: Optional[str]

class PodcastScript(TypedDict):
    speaker: str  # 'Host' or 'Guest'
    text: str
    audioEffect: Optional[str]

class Segment(TypedDict):
    id: str
    title: str
    purpose: str
    approxDurationSeconds: int
    bullets: List[str]

class EpisodeOutline(TypedDict):
    segments: List[Segment]

class KeyFact(TypedDict):
    fact: str
    source: Optional[str]
    confidence: float

class ImportantTerm(TypedDict):
    term: str
    definition: str

class NotablePerson(TypedDict):
    name: str
    whyRelevant: str
    shortQuote: Optional[str]

class RecommendedSource(TypedDict):
    title: str
    url: Optional[str]
    type: Optional[str]

class ResearchOutput(TypedDict):
    topic: str
    language: str
    estimatedDurationMinutes: int
    shortSummary: str
    episodeOutline: EpisodeOutline
    keyFacts: List[KeyFact]
    importantTerms: List[ImportantTerm]
    notablePeopleOrEntities: List[NotablePerson]
    recommendedSources: List[RecommendedSource]
    suggestedHooks: List[str]
    suggestedTone: str
    scriptNotesForSpeaker: List[str]

# ----- Cache Management -----
class CacheEntry:
    def __init__(self, value: ResearchOutput):
        self.value = value
        self.ts = datetime.now()

cache: dict[str, CacheEntry] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour

def cache_key(req: ResearchRequest) -> str:
    """Generate cache key from request"""
    json_str = json.dumps(req, sort_keys=True)
    return base64.b64encode(json_str.encode()).decode()

def get_from_cache(key: str) -> Optional[ResearchOutput]:
    """Retrieve from cache if not expired"""
    if key not in cache:
        return None
    
    entry = cache[key]
    if (datetime.now() - entry.ts).total_seconds() > CACHE_TTL_SECONDS:
        del cache[key]
        return None
    
    return entry.value

def set_cache(key: str, value: ResearchOutput) -> None:
    """Store in cache"""
    cache[key] = CacheEntry(value)

# ----- Style Guides -----
STYLE_GUIDES = {
    'conversational': 'Friendly, casual, like two friends chatting. Use colloquialisms, ask rhetorical questions, keep it light but informative.',
    'documentary': 'Formal, authoritative, journalistic. Focus on facts, timeline, verified sources. Narration-heavy, educational.',
    'investigative': 'Probing, curious, skeptical. Ask hard questions, explore controversies, dig deeper. Build suspense and intrigue.',
    'educational': 'Clear, structured, pedagogical. Define terms upfront, build from basics to complex. Think: teaching a student.',
    'storytelling': 'Narrative-driven, emotional, personal. Use anecdotes, character development, dramatic tension. Arc-based.'
}

# ----- Prompt Builder -----
def build_prompt(req: ResearchRequest) -> str:
    """Build Claude prompt"""
    style = req.get('style', 'conversational')
    language = req.get('language', 'English')
    style_guide = STYLE_GUIDES.get(style, STYLE_GUIDES['conversational'])

    return f"""You are an expert podcast research assistant. Your job is to generate a structured research brief for a {req['durationMinutes']}-minute podcast episode.

CRITICAL: Output ONLY valid JSON. No markdown, no explanation, no backticks. Start with {{ and end with }}.

STYLE & TONE:
{style_guide}

TARGET DURATION: {req['durationMinutes']} minutes ({req['durationMinutes'] * 60} total seconds)

SCHEMA (output exactly these fields):
{{
  "topic": string,
  "language": string,
  "estimatedDurationMinutes": number,
  "shortSummary": string (1-2 sentences, compelling hook),
  "episodeOutline": {{
    "segments": [
      {{
        "id": string (s1, s2, etc),
        "title": string (segment name matching the style),
        "purpose": string (why this segment exists),
        "approxDurationSeconds": number,
        "bullets": string[] (3-8 talking points the host can speak)
      }}
    ]
  }},
  "keyFacts": [
    {{
      "fact": string (single fact or statistic),
      "source": string or null (URL if available),
      "confidence": number (0-1, 1.0 = verified)
    }}
  ],
  "importantTerms": [
    {{ "term": string, "definition": string }}
  ],
  "notablePeopleOrEntities": [
    {{ "name": string, "whyRelevant": string, "shortQuote": string (optional) }}
  ],
  "recommendedSources": [
    {{ "title": string, "url": string (optional), "type": string (optional) }}
  ],
  "suggestedHooks": string[] (4-6 opening lines, each ≤20 words),
  "suggestedTone": string (one phrase describing how the host should sound),
  "scriptNotesForSpeaker": string[] (6-10 actionable notes for pacing, emotion, SFX)
}}

REQUIREMENTS:
1. Create 3-6 segments. Total duration should sum to ~{req['durationMinutes'] * 60} seconds.
2. Segments MUST follow the {style} style guide above. Titles and bullets should reflect that style.
3. Provide 6-12 key facts with credible sources when possible. If uncertain, set source=null and confidence low.
4. Provide 4-6 hooks that grab attention and tease the episode's core value.
5. Script notes should include: pacing cues, where to pause, emotional beats, sound effect opportunities, rhetorical questions.
6. Bullets are for the HOST TO SPEAK. They should be conversational, not robotic. Make them natural talking points.
7. Important terms should define jargon the listener might not know.
8. Notable people/entities should have a short reason why they matter (not just a quote).

RESEARCH TOPIC: {req['topic']}
OUTPUT LANGUAGE: {language}

NOW OUTPUT THE JSON:"""

# ----- OpenAI API Call -----
async def call_openai(prompt: str) -> str:
    """Call OpenAI API"""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError('Missing OPENAI_API_KEY environment variable')

    client = AsyncOpenAI(api_key=api_key)

    response = await client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=2000
    )

    if not response.choices or not response.choices[0].message:
        raise Exception('Unexpected OpenAI response format')

    return response.choices[0].message.content

# ----- JSON Extraction & Repair -----
def extract_json(text: str) -> Optional[str]:
    """Extract JSON from text"""
    start = text.find('{')
    if start == -1:
        return None

    end = text.rfind('}')
    if end == -1 or end <= start:
        return None

    return text[start:end + 1]

def repair_json(json_text: str) -> str:
    """Repair common JSON issues"""
    repaired = json_text

    # Remove markdown
    repaired = repaired.replace('```json', '').replace('```', '')

    # Replace single quotes with double quotes
    import re
    repaired = re.sub(r"'([^']*?)'", r'"\1"', repaired)

    # Remove trailing commas
    repaired = re.sub(r',\s*([}\]])', r'\1', repaired)

    return repaired

def safe_parse(json_text: str) -> Optional[dict]:
    """Safely parse JSON with repairs"""
    try:
        return json.loads(json_text)
    except json.JSONDecodeError:
        try:
            repaired = repair_json(json_text)
            return json.loads(repaired)
        except json.JSONDecodeError:
            return None

# ----- Validation & Normalization -----
def validate_and_normalize(obj: dict, req: ResearchRequest) -> ResearchOutput:
    """Validate and normalize research output"""
    out: ResearchOutput = {
        'topic': obj.get('topic', req['topic']),
        'language': obj.get('language', req.get('language', 'English')),
        'estimatedDurationMinutes': int(obj.get('estimatedDurationMinutes', req.get('durationMinutes', 10))),
        'shortSummary': obj.get('shortSummary', f"An exploration of {req['topic']}"),
        'episodeOutline': {'segments': []},
        'keyFacts': [],
        'importantTerms': [],
        'notablePeopleOrEntities': [],
        'recommendedSources': [],
        'suggestedHooks': [],
        'suggestedTone': obj.get('suggestedTone', req.get('style', 'conversational')),
        'scriptNotesForSpeaker': []
    }

    # Validate segments
    if obj.get('episodeOutline', {}).get('segments'):
        segments = obj['episodeOutline']['segments']
        segment_count = len(segments)
        seconds_per_segment = round((out['estimatedDurationMinutes'] * 60) / (segment_count or 3))

        out['episodeOutline']['segments'] = [
            {
                'id': str(s.get('id', f"s{i+1}")),
                'title': str(s.get('title', f"Segment {i+1}")),
                'purpose': str(s.get('purpose', '')),
                'approxDurationSeconds': int(s.get('approxDurationSeconds', seconds_per_segment)),
                'bullets': [str(b) for b in s.get('bullets', [])][:8]
            }
            for i, s in enumerate(segments[:10])
        ]

    # Validate facts
    if isinstance(obj.get('keyFacts'), list):
        out['keyFacts'] = [
            {
                'fact': str(f.get('fact', '')),
                'source': str(f.get('source')) if f.get('source') else None,
                'confidence': min(1, max(0, float(f.get('confidence', 0.5))))
            }
            for f in obj['keyFacts'][:12]
        ]

    # Validate terms
    if isinstance(obj.get('importantTerms'), list):
        out['importantTerms'] = [
            {
                'term': str(t.get('term', '')),
                'definition': str(t.get('definition', ''))
            }
            for t in obj['importantTerms'][:10]
        ]

    # Validate people/entities
    if isinstance(obj.get('notablePeopleOrEntities'), list):
        out['notablePeopleOrEntities'] = [
            {
                'name': str(p.get('name', '')),
                'whyRelevant': str(p.get('whyRelevant', '')),
                'shortQuote': str(p.get('shortQuote')) if p.get('shortQuote') else None
            }
            for p in obj['notablePeopleOrEntities'][:10]
        ]

    # Validate sources
    if isinstance(obj.get('recommendedSources'), list):
        out['recommendedSources'] = [
            {
                'title': str(s.get('title', '')),
                'url': str(s.get('url')) if s.get('url') else None,
                'type': str(s.get('type')) if s.get('type') else None
            }
            for s in obj['recommendedSources'][:10]
        ]

    # Validate hooks
    if isinstance(obj.get('suggestedHooks'), list):
        out['suggestedHooks'] = [str(h) for h in obj['suggestedHooks'][:8]]

    # Validate speaker notes
    if isinstance(obj.get('scriptNotesForSpeaker'), list):
        out['scriptNotesForSpeaker'] = [str(n) for n in obj['scriptNotesForSpeaker'][:12]]

    return out

# ----- Script Generation -----
def generate_script_from_research(research: ResearchOutput) -> List[PodcastScript]:
    """Convert research to podcast script"""
    script: List[PodcastScript] = []

    # INTRO
    script.append({
        'speaker': 'Host',
        'text': research['suggestedHooks'][0] if research['suggestedHooks'] else f"Let's talk about {research['topic']}",
        'audioEffect': 'fade_in'
    })

    # SEGMENTS
    for segment in research['episodeOutline']['segments']:
        # Host introduces
        script.append({
            'speaker': 'Host',
            'text': segment['bullets'][0] if segment['bullets'] else segment['title'],
            'audioEffect': None
        })

        # Guest responds
        script.append({
            'speaker': 'Guest',
            'text': "That's interesting. Can you elaborate on that?",
            'audioEffect': None
        })

        # Host elaborates
        for bullet in segment['bullets'][1:]:
            script.append({
                'speaker': 'Host',
                'text': bullet,
                'audioEffect': None
            })

        # Guest reaction
        if len(segment['bullets']) > 1:
            script.append({
                'speaker': 'Guest',
                'text': "Wow, I didn't know that.",
                'audioEffect': None
            })

    # OUTRO
    if research['scriptNotesForSpeaker']:
        script.append({
            'speaker': 'Host',
            'text': research['scriptNotesForSpeaker'][-1],
            'audioEffect': None
        })

    script.append({
        'speaker': 'Host',
        'text': 'Thanks for listening. See you next time.',
        'audioEffect': None
    })

    return script

# ----- Natural Conversation Script Generation -----
async def generate_conversational_script(research: ResearchOutput, req: ResearchRequest) -> List[PodcastScript]:
    """Generate a natural two-person podcast conversation using OpenAI"""
    
    style = req.get('style', 'conversational')
    style_guide = STYLE_GUIDES.get(style, STYLE_GUIDES['conversational'])
    
    # Build context from research
    facts_text = "\n".join([f"- {f['fact']}" for f in research['keyFacts'][:8]])
    terms_text = "\n".join([f"- {t['term']}: {t['definition']}" for t in research['importantTerms'][:5]])
    segments_text = "\n".join([f"- {s['title']}: {', '.join(s['bullets'][:3])}" for s in research['episodeOutline']['segments']])
    
    prompt = f"""You are writing a podcast script for a {req['durationMinutes']}-minute episode about "{research['topic']}".

CRITICAL: Output ONLY a valid JSON array. No markdown, no explanation, no backticks. Start with [ and end with ].

STYLE: {style_guide}

CHARACTERS:
- Host: The main presenter who guides the conversation, asks probing questions, and keeps things on track. Knowledgeable but curious.
- Guest: An expert or enthusiastic co-host who brings additional insights, personal anecdotes, different perspectives, and sometimes challenges or builds on what the Host says. NOT a passive listener.

CONVERSATION RULES:
1. BOTH speakers should contribute substantive content and knowledge
2. The Guest should share facts, opinions, and ask their own questions - NOT just react with "wow" or "interesting"
3. Include natural interruptions, agreements, disagreements, and building on each other's points
4. Use casual language, filler words occasionally (like "you know", "I mean", "right?")
5. Have moments where they laugh, express surprise genuinely, or get excited
6. The Guest can correct the Host or add nuance
7. Include rhetorical questions and direct address to listeners occasionally
8. Vary the length of responses - some short reactions, some longer explanations

RESEARCH TO INCORPORATE:
Key Facts:
{facts_text}

Key Terms:
{terms_text}

Topics to Cover:
{segments_text}

Summary: {research['shortSummary']}

OUTPUT FORMAT - Array of dialogue lines:
[
  {{"speaker": "Host", "text": "...", "audioEffect": "fade_in"}},
  {{"speaker": "Guest", "text": "...", "audioEffect": null}},
  ...
]

Generate approximately {max(15, req['durationMinutes'] * 3)} dialogue exchanges for a {req['durationMinutes']}-minute episode.
Each line should be 1-4 sentences. Make it feel like a REAL conversation between two knowledgeable friends.

NOW OUTPUT THE JSON ARRAY:"""

    try:
        raw = await call_openai(prompt)
        
        # Extract JSON array
        start = raw.find('[')
        end = raw.rfind(']')
        if start == -1 or end == -1 or end <= start:
            raise Exception("Could not find JSON array in response")
        
        json_text = raw[start:end + 1]
        
        # Try to parse
        try:
            script = json.loads(json_text)
        except json.JSONDecodeError:
            # Try to repair
            repaired = repair_json(json_text)
            script = json.loads(repaired)
        
        # Validate and normalize
        validated_script = []
        for i, line in enumerate(script):
            speaker = line.get('speaker', 'Host')
            if speaker not in ['Host', 'Guest']:
                speaker = 'Host' if i % 2 == 0 else 'Guest'
            
            validated_script.append({
                'speaker': speaker,
                'text': str(line.get('text', '')),
                'audioEffect': line.get('audioEffect') if i == 0 else None
            })
        
        return validated_script
        
    except Exception as e:
        print(f"Error generating conversational script: {e}")
        # Fallback to basic script from research
        return generate_script_from_research(research)

# ----- Main Export -----
async def generate_podcast_script(req: ResearchRequest) -> List[PodcastScript]:
    """Generate podcast script from topic, duration, and style"""
    key = cache_key(req)

    # Check cache
    cached = get_from_cache(key)
    if cached:
        return generate_script_from_research(cached)

    prompt = build_prompt(req)

    # LLM call with retries
    raw = ''
    last_error = None

    for attempt in range(3):
        try:
            raw = await call_openai(prompt)
            break
        except Exception as e:
            last_error = e
            await asyncio.sleep(0.5 * (attempt + 1))

    if not raw:
        raise Exception(f'LLM calls exhausted: {last_error}')

    # Extract and parse JSON
    candidate = extract_json(raw) or raw
    parsed = safe_parse(candidate)

    # Repair if needed
    if not parsed:
        repair_prompt = f"""You must output ONLY valid JSON. No explanation, no markdown.

Topic: {req['topic']}
Style: {req.get('style', 'conversational')}

Output the complete research JSON matching the schema provided earlier. Start with {{ and end with }}. Valid JSON only."""

        try:
            repair_raw = await call_openai(repair_prompt)
            candidate2 = extract_json(repair_raw) or repair_raw
            parsed = safe_parse(candidate2)

            if not parsed:
                raise Exception('JSON parsing failed after repair attempt')
        except Exception as e:
            raise Exception(f'Unable to parse LLM response: {e}')

    output = validate_and_normalize(parsed, req)
    set_cache(key, output)

    # Generate and return natural conversational script
    script = await generate_conversational_script(output, req)
    return script

# ----- Test Harness -----
if __name__ == '__main__':
    async def main():
        request: ResearchRequest = {
            'topic': 'Microplastics in drinking water',
            'durationMinutes': 18,
            'style': 'investigative',
            'language': 'English'
        }

        try:
            print('🎙️ Generating podcast script...')
            script = await generate_podcast_script(request)

            print('\n=== Podcast Script ===\n')
            for i, line in enumerate(script, 1):
                print(f"{i}. [{line['speaker']}]: {line['text']}")

            print(f'\n✅ Total lines: {len(script)}')
        except Exception as e:
            print(f'❌ Error: {e}')
            exit(1)

    asyncio.run(main())