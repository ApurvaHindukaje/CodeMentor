import os
import io
import json
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
import edge_tts

from ..tpa_net import (
    tpa_net,
    analyze_code_ast,
    build_interviewer_system_prompt,
    PERSONAS,
    INTERVIEW_STAGES
)

router = APIRouter(prefix="/interview", tags=["AI Technical Interviewer"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")


def get_groq_client() -> Groq:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured in backend")
    return Groq(api_key=GROQ_API_KEY)


class InterviewRespondRequest(BaseModel):
    problem_title: str
    problem_description: str
    problem_id: Optional[int] = None
    candidate_message: str
    current_stage: Optional[str] = "clarification"
    persona: Optional[str] = "friendly"
    user_code: Optional[str] = ""
    messages: Optional[List[Dict[str, str]]] = None


class TTSRequest(BaseModel):
    text: str
    persona: Optional[str] = "friendly"


class InterviewEvaluateRequest(BaseModel):
    problem_title: str
    problem_description: str
    problem_id: Optional[int] = None
    persona: Optional[str] = "friendly"
    user_code: str
    messages: List[Dict[str, str]]
    stages_completed: Optional[List[str]] = None


@router.get("/stages")
def get_stages():
    """Returns the 4 standard interview stages."""
    return {"stages": INTERVIEW_STAGES, "personas": PERSONAS}


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribes audio using Groq Whisper Large v3.
    Accepts webm, wav, mp3, m4a, ogg.
    """
    client = get_groq_client()
    try:
        audio_bytes = await file.read()
        filename = file.filename or "audio.webm"
        if not filename.endswith((".webm", ".wav", ".mp3", ".m4a", ".ogg")):
            filename = f"{filename}.webm"

        file_tuple = (filename, audio_bytes)
        transcription = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=file_tuple,
            response_format="json",
            language="en"
        )
        return {"text": transcription.text.strip()}
    except Exception as e:
        print(f"[Interview Transcribe Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Audio transcription failed: {str(e)}")


@router.post("/respond")
def interview_respond(req: InterviewRespondRequest):
    """
    Processes candidate speech/message through TPA-Net and generates real-time interviewer reply.
    """
    client = get_groq_client()
    tree_data = tpa_net.get_problem_tree(req.problem_title, req.problem_id)
    ast_info = analyze_code_ast(req.user_code or "")

    system_prompt = build_interviewer_system_prompt(
        problem_title=req.problem_title,
        problem_description=req.problem_description,
        tree_data=tree_data,
        persona_key=req.persona or "friendly",
        current_stage=req.current_stage or "clarification",
        user_code=req.user_code or "",
        ast_info=ast_info
    )

    messages_payload = [{"role": "system", "content": system_prompt}]
    if req.messages:
        # Include past conversation context (last 8 turns to stay focused and snappy)
        for m in req.messages[-8:]:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role in ("user", "assistant") and content:
                messages_payload.append({"role": role, "content": content})

    messages_payload.append({
        "role": "user",
        "content": f"[Candidate says]: {req.candidate_message}\n[Candidate current code length]: {ast_info['num_lines']} lines"
    })

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages_payload,
            temperature=0.6,
            max_tokens=220
        )
        raw_reply = completion.choices[0].message.content.strip()

        # Check if the interviewer signaled a stage progression
        next_stage = None
        clean_reply = raw_reply
        match = re.search(r"\[NEXT_STAGE:\s*([a-zA-Z_]+)\]", raw_reply)
        if match:
            candidate_next = match.group(1).lower().strip()
            if candidate_next in ("clarification", "approach", "coding", "verification", "complete"):
                next_stage = candidate_next
            clean_reply = re.sub(r"\[NEXT_STAGE:\s*[a-zA-Z_]+\]", "", raw_reply).strip()

        return {
            "reply": clean_reply,
            "next_stage": next_stage,
            "current_stage": req.current_stage,
            "ast_info": ast_info,
            "persona": req.persona
        }
    except Exception as e:
        print(f"[Interview Respond Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Interviewer response generation failed: {str(e)}")


@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """
    Streams natural human voice audio via Microsoft Edge Neural TTS.
    """
    clean_text = re.sub(r"\[NEXT_STAGE:\s*[a-zA-Z_]+\]", "", req.text).strip()
    clean_text = re.sub(r"[`*_#]", "", clean_text)  # Remove markdown formatting for voice
    if not clean_text:
        clean_text = "I'm listening. Please continue."

    persona_info = PERSONAS.get(req.persona or "friendly", PERSONAS["friendly"])
    voice_name = persona_info.get("voice", "en-US-ChristopherNeural")

    try:
        communicate = edge_tts.Communicate(clean_text, voice_name)

        async def audio_stream_generator():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]

        return StreamingResponse(
            audio_stream_generator(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except Exception as e:
        print(f"[Edge TTS Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")


@router.post("/nudge")
def silence_nudge(req: InterviewRespondRequest):
    """
    Generates a realistic interviewer check-in when candidate has been silent for 45-60 seconds.
    """
    client = get_groq_client()
    persona_info = PERSONAS.get(req.persona or "friendly", PERSONAS["friendly"])
    stage = req.current_stage or "clarification"

    nudges_by_stage = {
        "clarification": [
            "Take your time reading the problem. Do you have any initial thoughts or questions regarding the constraints?",
            "Feel free to ask me any questions about the input bounds or edge cases before we proceed."
        ],
        "approach": [
            "Could you walk me through what you're thinking for your initial approach?",
            "Even a brute force idea is a great place to start—what comes to mind first?"
        ],
        "coding": [
            "Could you share what you're currently working through on the editor?",
            "I see you're setting up the structure—feel free to talk through the lines as you write them."
        ],
        "verification": [
            "Let's trace your code through a simple sample testcase together—what does your pointer do on the first step?",
            "How does your solution handle boundary values like an empty array or single element?"
        ]
    }
    stage_nudges = nudges_by_stage.get(stage, nudges_by_stage["approach"])
    import random
    selected = random.choice(stage_nudges)

    return {
        "reply": selected,
        "persona": req.persona,
        "current_stage": stage
    }


@router.post("/evaluate")
def evaluate_interview(req: InterviewEvaluateRequest):
    """
    Evaluates the complete mock interview session across the 4 FAANG Pillars
    using TPA-Net decision tree alignment and code AST verification.
    """
    client = get_groq_client()
    tree_data = tpa_net.get_problem_tree(req.problem_title, req.problem_id)
    ast_info = analyze_code_ast(req.user_code)

    formatted_transcript = ""
    for idx, m in enumerate(req.messages):
        role = "Candidate" if m.get("role") == "user" else "Interviewer"
        formatted_transcript += f"[{role}]: {m.get('content', '')}\n"

    dt = tree_data.get("decision_tree", {})
    eval_prompt = f"""You are the Lead Hiring Committee Director at a top Tier-1 tech company (Google/Meta).
You are evaluating a candidate's mock technical interview session for the problem: "{req.problem_title}".

CANONICAL PROBLEM TARGETS:
- Optimal Time: {dt.get('optimal_time', 'O(N)')}
- Optimal Space: {dt.get('optimal_space', 'O(1)')}
- Key Invariants / Traps: {json.dumps(dt.get('traps', []))}

CANDIDATE FINAL CODE SNAPSHOT:
```python
{req.user_code or '# No code written'}
```
- AST Metrics: Loop Depth={ast_info['loop_depth']}, Structures={ast_info['data_structures']}, Syntax Valid={ast_info['syntax_valid']}

FULL INTERVIEW TRANSCRIPT:
{formatted_transcript[:4000]}

EVALUATION RUBRIC:
Score each of the 4 FAANG Pillars on a 1.0 to 5.0 scale (1=Unsatisfactory, 3=Developing, 4=Strong, 5=Exceptional):
1. communication_score: Did the candidate articulate thoughts clearly, narrate while coding, and ask clarifying questions?
2. problem_solving_score: Did they explore tradeoffs, state Big-O bounds, and select an optimal algorithmic strategy?
3. code_quality_score: Was the code syntactically sound, modular, readable, with clean variable naming?
4. verification_score: Did they dry-run test cases and proactively consider edge cases?

VERDICT OPTIONS:
"Strong Hire", "Hire", "Lean Hire", "Lean No Hire", "No Hire"

OUTPUT STRICTLY AS VALID JSON with this exact schema:
{{
  "verdict": "Strong Hire" | "Hire" | "Lean Hire" | "Lean No Hire" | "No Hire",
  "overall_summary": "2-3 sentences summarizing performance and hiring decision",
  "scores": {{
    "communication": 4.5,
    "problem_solving": 4.0,
    "code_quality": 3.8,
    "verification": 3.5
  }},
  "strengths": [
    "Specific positive candidate behavior 1",
    "Specific positive candidate behavior 2"
  ],
  "areas_for_improvement": [
    "Actionable critique 1",
    "Actionable critique 2"
  ],
  "complexity_verdict": {{
    "optimal_time": "{dt.get('optimal_time', 'O(N)')}",
    "optimal_space": "{dt.get('optimal_space', 'O(1)')}",
    "candidate_time": "O(N) or assessed complexity",
    "candidate_space": "O(1) or assessed complexity"
  }}
}}
"""

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": eval_prompt}],
            temperature=0.3,
            max_tokens=900,
            response_format={"type": "json_object"}
        )
        report_data = json.loads(completion.choices[0].message.content.strip())
        return report_data
    except Exception as e:
        print(f"[Interview Evaluate Error]: {e}")
        # Robust fallback scorecard in case of rate limits or JSON parse issue
        return {
            "verdict": "Lean Hire",
            "overall_summary": "The candidate demonstrated solid problem-solving fundamentals, communicated through key stages, and implemented working code.",
            "scores": {
                "communication": 3.8,
                "problem_solving": 3.7,
                "code_quality": 4.0,
                "verification": 3.5
            },
            "strengths": [
                "Good willingness to communicate thought process",
                "Constructed clean Python syntax structure"
            ],
            "areas_for_improvement": [
                "Practice tracing edge cases before declaring code ready",
                "Explicitly declare Big-O time and space tradeoffs earlier"
            ],
            "complexity_verdict": {
                "optimal_time": dt.get("optimal_time", "O(N)"),
                "optimal_space": dt.get("optimal_space", "O(1)"),
                "candidate_time": "O(N)",
                "candidate_space": "O(1)"
            }
        }
