import os
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import re

router = APIRouter(prefix="/ai", tags=["AI Mentor"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")


class AIMentorRequest(BaseModel):
    problem_title: str
    problem_description: str
    user_code: Optional[str] = ""
    action: Optional[str] = "chat"  # "hint" | "analyze" | "explain" | "chat" | "diagnose" | "fuzz"
    custom_query: Optional[str] = None
    messages: Optional[List[Dict[str, str]]] = None
    execution_context: Optional[Dict[str, Any]] = None


def build_system_and_prompt(req: AIMentorRequest):
    system_prompt = (
        "You are an intelligent, friendly, and practical AI coding assistant directly integrated into an interview coding platform, just like ChatGPT.\n\n"
        "CURRENT CONTEXT (FOR YOUR REFERENCE ONLY — DO NOT RECITE UNLESS ASKED):\n"
        f"- Problem: {req.problem_title}\n"
        f"- Description: {req.problem_description}\n"
        f"- Student's Current Code:\n```python\n{req.user_code or '# No code written yet'}\n```\n\n"
    )

    if req.execution_context:
        ctx = req.execution_context
        system_prompt += "LATEST EXECUTION RUNTIME DATA (REAL-TIME CONTEXT FROM RUNNER):\n"
        if ctx.get("status"):
            system_prompt += f"- Verdict Status: {ctx['status']}\n"
        if ctx.get("error_message"):
            system_prompt += f"- Error Message / Traceback: {ctx['error_message']}\n"
        failed_case = ctx.get("failed_case")
        if failed_case and isinstance(failed_case, dict):
            system_prompt += (
                f"- Failing Test Case #{failed_case.get('test_case', 1)}\n"
                f"- Input Arguments: {failed_case.get('input', '')}\n"
                f"- Expected Return: {failed_case.get('expected', '')}\n"
                f"- User Code Return Output: {failed_case.get('actual', '')}\n"
                f"- User Code Stdout Logs: {failed_case.get('stdout', '')}\n"
                f"- Error Details: {failed_case.get('error', '')}\n"
            )
        system_prompt += "\n"

    system_prompt += (
        "CONVERSATIONAL GUIDELINES:\n"
        "1. Talk naturally, casually, and directly like ChatGPT. Never use robotic scripts, stiff templates, or unsolicited long lectures.\n"
        "2. Answer ONLY what the user explicitly asks. Keep your answers concise, direct, and helpful.\n"
        "3. When the user says 'hey', 'hi', or greets you, reply casually in one short sentence. NEVER jump straight into explaining the algorithm or problem on a simple greeting.\n"
        "4. If the user asks for a hint, give a clean, intuitive tip.\n"
        "5. If the user asks for code, debugging, or optimization, provide clear, concise Python code and explain the key logic.\n"
        "6. If the user asks about complexity, state the Time and Space Big-O directly.\n"
        "7. Format code snippets in clean markdown with ```python.\n"
        "8. DIAGNOSTIC MODE: When diagnosing an execution failure, pinpoint the exact line, loop iteration, or variable condition where the user's code diverged or crashed for that specific input. Explain the root cause clearly without unnecessary filler.\n"
        "9. COUNTER-EXAMPLE / FUZZER MODE: Find an adversarial boundary case or edge input (e.g. empty list, single element, duplicates, negative values, extreme target) where their current logic will fail. You MUST include a JSON block in your response formatted exactly as:\n"
        "```json\n"
        "{\n"
        '  "input": "<arguments to function, e.g. [3, 3], 6>",\n'
        '  "expected": "<expected return, e.g. [0, 1]>",\n'
        '  "explanation": "<1-2 sentences on why this edge case breaks the student logic>"\n'
        "}\n"
        "```\n"
    )

    if req.action == "diagnose":
        user_prompt = (
            req.custom_query
            or "Why did my code fail on this test case? Pinpoint the exact line or condition that caused the mismatch or error, and explain why."
        )
    elif req.action == "fuzz":
        user_prompt = (
            req.custom_query
            or "Inspect my code and find an adversarial counter-example or tricky edge case where my current logic will fail. Output the testcase input in a JSON block."
        )
    elif req.action == "hint":
        user_prompt = req.custom_query or "Can you give me a clear hint on how to approach this problem?"
    elif req.action == "analyze":
        user_prompt = req.custom_query or "What is the time and space complexity of my current code, and can it be optimized?"
    elif req.action == "explain":
        user_prompt = req.custom_query or "Can you explain the main idea and pattern for this problem in simple terms?"
    elif req.action == "debug":
        user_prompt = req.custom_query or "Can you review my code and point out any bugs or edge cases I missed?"
    else:
        user_prompt = req.custom_query or "Hi!"

    return system_prompt, user_prompt


def get_conversation_payload(req: AIMentorRequest):
    system_prompt, user_prompt = build_system_and_prompt(req)
    messages_payload = [{"role": "system", "content": system_prompt}]

    # If past conversation history is provided, include the recent history for conversational memory
    if req.messages and len(req.messages) > 0:
        for m in req.messages[-8:]:  # keep last 8 turns for context window efficiency
            if m.get("role") in ["user", "assistant"] and m.get("content"):
                messages_payload.append({"role": m["role"], "content": m["content"]})

    # Only append user_prompt if it isn't already the last user message
    if not (messages_payload and messages_payload[-1].get("role") == "user" and messages_payload[-1].get("content") == user_prompt):
        messages_payload.append({"role": "user", "content": user_prompt})

    return messages_payload


def stream_groq(messages_payload: list):
    if not GROQ_API_KEY:
        yield "⚠️ Groq API key not configured. Please set GROQ_API_KEY in your backend .env file."
        return

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        completion = client.chat.completions.create(
            messages=messages_payload,
            model=GROQ_MODEL,
            temperature=0.3,
            max_tokens=850,
            stream=True
        )
        for chunk in completion:
            content = chunk.choices[0].delta.content
            if content:
                yield content
    except Exception as e:
        yield f"\n\n⚠️ AI Mentor service error: {str(e)}"


@router.post("/assist")
def ai_assist(req: AIMentorRequest):
    messages_payload = get_conversation_payload(req)
    if not GROQ_API_KEY:
        return {"action": req.action, "response": "Groq API key not configured. Please set GROQ_API_KEY in your backend .env file."}

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        chat_completion = client.chat.completions.create(
            messages=messages_payload,
            model=GROQ_MODEL,
            temperature=0.3,
            max_tokens=850
        )
        response_text = chat_completion.choices[0].message.content
        counter_example = None
        if req.action == "fuzz" or "```json" in response_text:
            try:
                json_match = re.search(r"```json\s*(\{.*?\})\s*```", response_text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(1))
                    if "input" in parsed:
                        counter_example = parsed
            except Exception:
                pass

        return {
            "action": req.action,
            "response": response_text,
            "counter_example": counter_example
        }
    except Exception as e:
        return {"action": req.action, "response": f"AI Mentor service temporarily unavailable: {str(e)}"}


@router.post("/stream")
def ai_stream(req: AIMentorRequest):
    messages_payload = get_conversation_payload(req)
    return StreamingResponse(
        stream_groq(messages_payload),
        media_type="text/plain; charset=utf-8"
    )

