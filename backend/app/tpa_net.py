import os
import json
import ast
import re
from typing import Dict, Any, List, Optional, Tuple

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "leetcode_500.json")

# Voice personas configuration
PERSONAS = {
    "friendly": {
        "name": "Alex (Senior Software Engineer at Google)",
        "tone": "Casual, warm, spontaneous, and conversational. Talks like an authentic human engineer sitting across from you on Google Meet.",
        "voice": "en-US-AvaNeural",
        "style_guidance": (
            "You are a Senior Software Engineer at Google interviewing a candidate live over Google Meet. "
            "You are warm, conversational, encouraging, and speak like a real peer engineer. "
            "You keep the session collaborative and natural, never formal or academic."
        )
    },
    "strict": {
        "name": "Marcus (Staff Bar-Raiser at Meta)",
        "tone": "Direct, incisive, intellectually sharp, yet completely natural. Pragmatic engineering lead who probes algorithmic rigor.",
        "voice": "en-US-GuyNeural",
        "style_guidance": (
            "You are a Meta Staff Software Engineer and Bar-Raiser conducting a technical interview. "
            "You are direct, sharp, pragmatic, and respectful. You speak naturally like an experienced colleague who cuts straight to core trade-offs: time complexity, space overhead, and edge cases. "
            "You never sound like a robotic proctor or an automated grading script."
        )
    }
}

INTERVIEW_STAGES = [
    {
        "id": "clarification",
        "title": "1. Clarify Constraints",
        "desc": "Ask about edge cases, input bounds, negative numbers, duplicates, and empty states."
    },
    {
        "id": "approach",
        "title": "2. Approach & Tradeoffs",
        "desc": "Propose brute force vs optimal solution and state Time & Space Big-O before coding."
    },
    {
        "id": "coding",
        "title": "3. Live Implementation",
        "desc": "Write clean, modular code while talking through your thought process out loud."
    },
    {
        "id": "verification",
        "title": "4. Dry-Run & Edge Cases",
        "desc": "Trace your code step-by-step through a concrete testcase before running."
    }
]


class TPANetKnowledgeBase:
    """
    Thought-Process Alignment Network (TPA-Net)
    Problem-Trained Algorithmic Knowledge & Decision Tree Engine.
    Pre-indexes 500 problems into Canonical Problem Decision Trees (CPDT).
    """
    def __init__(self):
        self.problem_index: Dict[str, Dict[str, Any]] = {}
        self.problem_id_index: Dict[int, Dict[str, Any]] = {}
        self._load_and_index()

    def _load_and_index(self):
        if not os.path.exists(DATA_FILE):
            return

        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                problems = json.load(f)

            for idx, p in enumerate(problems):
                pid = idx + 1
                title = p.get("title", "")
                norm_key = self._normalize_title(title)
                
                decision_tree = self._build_canonical_decision_tree(p)
                record = {
                    "id": pid,
                    "title": title,
                    "difficulty": p.get("difficulty", "Medium"),
                    "topics": p.get("topics", []),
                    "optimal_time": p.get("optimal_time_complexity", "O(N)"),
                    "optimal_space": p.get("optimal_space_complexity", "O(1)"),
                    "complexity_notes": p.get("complexity_notes", ""),
                    "sample_input": p.get("sample_input", ""),
                    "sample_output": p.get("sample_output", ""),
                    "decision_tree": decision_tree
                }
                self.problem_index[norm_key] = record
                self.problem_id_index[pid] = record
        except Exception as e:
            print(f"[TPA-Net] Warning loading dataset: {e}")

    def _normalize_title(self, title: str) -> str:
        return re.sub(r"[^a-z0-9]", "", title.lower())

    def _build_canonical_decision_tree(self, p: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synthesizes the problem-specific Canonical Decision Tree (CPDT):
        - Clarifying checkpoints
        - Trajectory spectrum (Brute Force -> Optimal)
        - Core algorithmic invariants
        - High-risk failure traps
        """
        title = p.get("title", "").lower()
        topics = [t.lower() for t in p.get("topics", [])]
        opt_time = p.get("optimal_time_complexity", "O(N)")
        opt_space = p.get("optimal_space_complexity", "O(1)")

        # Derive clarifying questions based on topics and problem keywords
        clarifications = [
            "Are input elements guaranteed to be non-empty and within standard bounds?",
            "Can the inputs include negative numbers or 0?",
            "Are there possible duplicate values, and should they be handled uniquely?"
        ]

        if any(t in topics for t in ["array", "hash table"]):
            clarifications.append("Can we modify the input array in-place, or is it read-only?")
        if any(t in topics for t in ["string"]):
            clarifications.append("Is the string guaranteed to be ASCII/alphanumeric, and is it case-sensitive?")
        if any(t in topics for t in ["tree", "binary search tree"]):
            clarifications.append("Can the tree root be null, or have only a single node?")
        if any(t in topics for t in ["linked list"]):
            clarifications.append("Can the list have cycles or be empty?")
        if any(t in topics for t in ["dynamic programming"]):
            clarifications.append("What are the upper bound constraints for N and target values to prevent memory limits?")

        # Derive approaches
        trajectories = []
        if "O(N^2)" not in opt_time and "O(2^N)" not in opt_time:
            trajectories.append({
                "type": "brute_force",
                "time": "O(N^2)" if "O(N^3)" not in opt_time else "O(N^3)",
                "space": "O(1)",
                "description": "Exhaustive nested search or generate all subsets/permutations."
            })

        if "log" in opt_time or "n log n" in opt_time.lower():
            trajectories.append({
                "type": "sorting_or_divide_conquer",
                "time": "O(N log N)",
                "space": "O(1) to O(N)",
                "description": "Pre-sort input or use binary search / heap partition."
            })

        trajectories.append({
            "type": "optimal",
            "time": opt_time,
            "space": opt_space,
            "description": p.get("complexity_notes") or f"Optimal algorithm achieving {opt_time} and {opt_space}."
        })

        # Traps and Invariants
        traps = [
            "Off-by-one index error on boundary termination",
            "Handling empty or single-element inputs gracefully",
            "Reusing the same element when distinct elements are required"
        ]
        if "hash" in "".join(topics):
            traps.append("Hash table key collisions or lookup with incorrect type")
        if "two pointer" in "".join(topics) or "sliding window" in "".join(topics):
            traps.append("Pointer crossover: left passing right without loop termination")

        return {
            "clarifications": clarifications,
            "trajectories": trajectories,
            "traps": traps,
            "optimal_time": opt_time,
            "optimal_space": opt_space
        }

    def get_problem_tree(self, title: str, pid: Optional[int] = None) -> Dict[str, Any]:
        if pid and pid in self.problem_id_index:
            return self.problem_id_index[pid]
        norm = self._normalize_title(title)
        if norm in self.problem_index:
            return self.problem_index[norm]
        
        # Fallback generic tree if problem not in 500 catalog
        return {
            "id": pid or 0,
            "title": title,
            "difficulty": "Medium",
            "topics": ["Algorithms"],
            "optimal_time": "O(N)",
            "optimal_space": "O(1)",
            "complexity_notes": "Optimal single pass with constant auxiliary space",
            "decision_tree": {
                "clarifications": [
                    "Can the input be empty or null?",
                    "Are negative numbers or duplicates possible?",
                    "What are the maximum input size constraints?"
                ],
                "trajectories": [
                    {"type": "brute_force", "time": "O(N^2)", "space": "O(1)", "description": "Naive search"},
                    {"type": "optimal", "time": "O(N)", "space": "O(1)", "description": "Single-pass algorithm"}
                ],
                "traps": [
                    "Off-by-one indexing error",
                    "Unchecked null/empty edge case"
                ],
                "optimal_time": "O(N)",
                "optimal_space": "O(1)"
            }
        }


# Global singleton instance of TPA-Net Knowledge Base
tpa_net = TPANetKnowledgeBase()


def analyze_code_ast(code: str) -> Dict[str, Any]:
    """
    Extracts structural AST features from candidate code during live interview.
    Detects functions, loop nesting, data structure allocations, and recursion.
    """
    features = {
        "has_function": False,
        "function_names": [],
        "num_lines": len(code.strip().split("\n")) if code.strip() else 0,
        "loop_depth": 0,
        "has_recursion": False,
        "data_structures": [],
        "syntax_valid": True,
        "syntax_error": None
    }

    if not code.strip():
        return features

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        features["syntax_valid"] = False
        features["syntax_error"] = str(e)
        return features

    max_depth = 0
    func_names = []

    def check_depth(node, current_depth=0):
        nonlocal max_depth
        if isinstance(node, (ast.For, ast.While)):
            current_depth += 1
            if current_depth > max_depth:
                max_depth = current_depth
        for child in ast.iter_child_nodes(node):
            check_depth(child, current_depth)

    check_depth(tree)
    features["loop_depth"] = max_depth

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_names.append(node.name)
            features["has_function"] = True

        if isinstance(node, ast.Dict):
            if "dict/hashmap" not in features["data_structures"]:
                features["data_structures"].append("dict/hashmap")
        elif isinstance(node, ast.Set):
            if "set" not in features["data_structures"]:
                features["data_structures"].append("set")
        elif isinstance(node, ast.List):
            if "list" not in features["data_structures"]:
                features["data_structures"].append("list")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                fname = node.func.id
                if fname in ("dict", "set", "defaultdict", "Counter"):
                    if fname not in features["data_structures"]:
                        features["data_structures"].append(fname)
                if fname in func_names:
                    features["has_recursion"] = True

    features["function_names"] = func_names
    return features


def build_interviewer_system_prompt(
    problem_title: str,
    problem_description: str,
    tree_data: Dict[str, Any],
    persona_key: str = "friendly",
    current_stage: str = "clarification",
    user_code: str = "",
    ast_info: Optional[Dict[str, Any]] = None
) -> str:
    persona = PERSONAS.get(persona_key, PERSONAS["friendly"])
    dt = tree_data.get("decision_tree", {})

    prompt = f"""You are {persona['name']}, conducting a live 1-on-1 technical coding interview on a video call.
You are speaking out loud through voice audio in real time.

YOUR CHARACTER & CONVERSATIONAL STYLE:
{persona['style_guidance']}

CONVERSATIONAL RULES (CRITICAL FOR REALISM):
1. SOUND LIKE A REAL HUMAN INTERVIEWER:
   - Speak naturally and conversationally. Keep responses strictly to 1 to 2 spoken sentences (maximum 35 words).
   - NEVER repeat the exact phrasing or sentences from earlier in the chat. Vary your wording dynamically.
   - BANNED PHRASES: NEVER start every question with "Wait, how would...". Do NOT repeat formulaic structures.
   - ZERO CORPORATE/ROBOT CLICHÉS: NEVER say "I'm here to assess your problem-solving skills", "As an AI", "Please proceed to explain", or recite dry definitions.

2. HOW TO HANDLE REAL-WORLD CANDIDATE SCENARIOS:
   - When candidate asks for the answer ("Give me the answer", "How do I solve this?", "I'm stuck"):
     Respond with genuine engineer banter and an intuitive nudge:
     "Haha, I can't just give you the solution in an interview, but let's break it down: if we're at a number, what value would complete the sum?"
   - When candidate says something confusing, slang, or a speech typo ("hashtag", "random phrase"):
     React naturally like a human who heard a slight glitch or slang:
     "A hashtag? Guessing you mean a hash map? Tell me what you'd key on."
   - When candidate proposes an unfitting data structure (heap, sliding window, pointers):
     Ask an authentic question about the actual constraint:
     "A sliding window usually needs contiguous items or sorted order—how would it find arbitrary pairs across the array?" or
     "Three pointers? What would they track if the array isn't sorted?"
   - When candidate proposes a valid idea (e.g. hash map):
     Acknowledge it naturally and probe implementation:
     "A hash map is great for constant-time lookups. What are you storing as the keys versus values?"

3. STAGE PROGRESSION:
   - Current stage: {current_stage.upper()}
   - Target optimal: Time {dt.get('optimal_time', 'O(N)')}, Space {dt.get('optimal_space', 'O(1)')}
   - When candidate explains a solid optimal approach, invite them to start coding and append: [NEXT_STAGE: coding]
   - When code is drafted, guide them to dry-run test cases: [NEXT_STAGE: verification]
   - When verified, conclude the interview: [NEXT_STAGE: complete]

PROBLEM CONTEXT:
- Problem: {problem_title}
- Description: {problem_description[:600]}

CANDIDATE CODE:
```python
{user_code or '# No code written yet'}
```
"""
    return prompt
