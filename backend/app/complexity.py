import ast
import os
import json
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

TIER_LABELS = ["O(1)", "O(log N)", "O(N)", "O(N log N)", "O(N^2)", "O(2^N)"]


def parse_tier(complexity_str: str) -> int:
    c = complexity_str.upper().replace(" ", "").replace("*", "")
    if "O(1)" in c:
        return 0
    if "LOG" in c and "NLOG" not in c and "N*LOG" not in c:
        return 1
    if "NLOG" in c or "N*LOG" in c:
        return 3
    if "N^2" in c or "N2" in c or "N*N" in c:
        return 4
    if "2^N" in c or "2N" in c:
        return 5
    if "O(N)" in c or "O(N+M)" in c or "O(M)" in c:
        return 2
    return 2


def ast_analyze_code(code: str) -> Tuple[str, str, str, str]:
    """
    Fast, deterministic AST analyzer for Python algorithm code.
    Returns: (time_complexity, space_complexity, time_summary, space_summary)
    """
    try:
        tree = ast.parse(code)
    except Exception:
        return "O(N)", "O(1)", "Standard linear execution", "Constant auxiliary memory"

    max_depth = 0
    has_sort = False
    has_hash_struct = False
    has_list_alloc = False
    has_recursion = False
    nested_in_list = False

    # Track variables known to be dicts or sets
    known_hash_vars = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            if isinstance(node.value, (ast.Dict, ast.Set)):
                for t in node.targets:
                    if isinstance(t, ast.Name):
                        known_hash_vars.add(t.id)
            elif isinstance(node.value, ast.Call):
                if isinstance(node.value.func, ast.Name) and node.value.func.id in ("dict", "set", "defaultdict", "Counter"):
                    for t in node.targets:
                        if isinstance(t, ast.Name):
                            known_hash_vars.add(t.id)

    def get_loop_depth(node, depth=0):
        nonlocal max_depth, nested_in_list
        current_max = depth
        if depth > max_depth:
            max_depth = depth

        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.For, ast.While)):
                d = get_loop_depth(child, depth + 1)
                if d > current_max:
                    current_max = d
            else:
                # Check for 'x in list' inside a loop (only if target is NOT a known hash set/dict)
                if depth >= 1 and isinstance(child, ast.Compare):
                    for i, op in enumerate(child.ops):
                        if isinstance(op, (ast.In, ast.NotIn)):
                            comparator = child.comparators[i]
                            if isinstance(comparator, ast.Name) and comparator.id in known_hash_vars:
                                # O(1) hash lookup
                                pass
                            else:
                                # Membership check on a list or unindexed collection
                                nested_in_list = True
                d = get_loop_depth(child, depth)
                if d > current_max:
                    current_max = d
        return current_max

    get_loop_depth(tree, 0)

    # Check for calls, structures, and function definitions
    func_names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            func_names.add(node.name)

        if isinstance(node, ast.Call):
            # Check sorting
            if isinstance(node.func, ast.Name) and node.func.id in ("sorted",):
                has_sort = True
            elif isinstance(node.func, ast.Attribute) and node.func.attr in ("sort",):
                has_sort = True

            # Check recursion
            if isinstance(node.func, ast.Name) and node.func.id in func_names:
                has_recursion = True

            # Check structures
            if isinstance(node.func, ast.Name) and node.func.id in ("dict", "set", "defaultdict", "Counter"):
                has_hash_struct = True
            elif isinstance(node.func, ast.Name) and node.func.id in ("list",):
                has_list_alloc = True

        if isinstance(node, (ast.Dict, ast.Set)):
            has_hash_struct = True
        elif isinstance(node, (ast.ListComp, ast.DictComp, ast.SetComp)):
            if isinstance(node, ast.ListComp):
                has_list_alloc = True
            else:
                has_hash_struct = True

    # Determine Time Complexity
    if max_depth >= 2 or nested_in_list:
        time_comp = "O(N^2)"
        time_summary = "Nested loop scan detected over input collection" if max_depth >= 2 else "Linear membership check inside loop (O(N * N))"
    elif has_sort:
        time_comp = "O(N log N)"
        time_summary = "Comparison-based sorting operation detected"
    elif max_depth == 1:
        time_comp = "O(N)"
        time_summary = "Single-pass linear traversal through elements"
    elif has_recursion:
        time_comp = "O(N)"
        time_summary = "Recursive depth-first traversal"
    else:
        time_comp = "O(1)"
        time_summary = "Constant time operations with no scalable loops"

    # Determine Space Complexity
    if has_hash_struct:
        space_comp = "O(N)"
        space_summary = "Auxiliary hash table/set allocated to track elements"
    elif has_list_alloc or has_recursion:
        space_comp = "O(N)"
        space_summary = "Auxiliary array allocation / recursive call stack"
    else:
        space_comp = "O(1)"
        space_summary = "Constant O(1) auxiliary memory (in-place variables/pointers)"

    return time_comp, space_comp, time_summary, space_summary


def groq_analyze_complexity(code: str, problem_title: str) -> Dict[str, str]:
    if not GROQ_API_KEY:
        return {}

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        prompt = (
            f"Analyze the Time and Space Big-O asymptotic complexity of this Python solution for '{problem_title}'.\n"
            f"Code:\n```python\n{code}\n```\n\n"
            "Return ONLY a valid JSON object with exact keys: 'time', 'space', 'time_summary', 'space_summary'.\n"
            "Example format: {\"time\": \"O(N)\", \"space\": \"O(N)\", \"time_summary\": \"Single pass loop.\", \"space_summary\": \"Hash map storing elements.\"}\n"
            "Valid complexity values: O(1), O(log N), O(N), O(N log N), O(N^2), O(2^N)."
        )
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an expert algorithms compiler analyzing Big-O asymptotic complexity. Always output raw JSON only."},
                {"role": "user", "content": prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.1,
            max_tokens=250,
            response_format={"type": "json_object"}
        )
        res_text = completion.choices[0].message.content.strip()
        return json.loads(res_text)
    except Exception:
        return {}


def analyze_complexity(code: str, problem_title: str, optimal_time: str = "O(N)", optimal_space: str = "O(1)") -> Dict[str, Any]:
    # 1. Baseline fast AST
    ast_time, ast_space, ast_t_sum, ast_s_sum = ast_analyze_code(code)

    user_time = ast_time
    user_space = ast_space
    time_summary = ast_t_sum
    space_summary = ast_s_sum

    # 2. Try fast Groq refinement if available
    try:
        ai_res = groq_analyze_complexity(code, problem_title)
        if ai_res.get("time") and any(tier in ai_res["time"] for tier in ["O(1)", "log", "O(N)", "N^2", "2^N"]):
            user_time = ai_res["time"]
            if ai_res.get("time_summary"):
                time_summary = ai_res["time_summary"]
        if ai_res.get("space") and any(tier in ai_res["space"] for tier in ["O(1)", "log", "O(N)", "N^2"]):
            user_space = ai_res["space"]
            if ai_res.get("space_summary"):
                space_summary = ai_res["space_summary"]
    except Exception:
        pass

    user_time_tier = parse_tier(user_time)
    optimal_time_tier = parse_tier(optimal_time)

    user_space_tier = parse_tier(user_space)
    optimal_space_tier = parse_tier(optimal_space)

    is_time_optimal = user_time_tier <= optimal_time_tier
    is_space_optimal = user_space_tier <= optimal_space_tier

    return {
        "time": {
            "user": user_time,
            "user_tier": user_time_tier,
            "optimal": optimal_time,
            "optimal_tier": optimal_time_tier,
            "is_optimal": is_time_optimal,
            "verdict": "Optimal" if is_time_optimal else f"Suboptimal ({user_time_tier - optimal_time_tier} Tier{'s' if user_time_tier - optimal_time_tier > 1 else ''} Slower)",
            "summary": time_summary
        },
        "space": {
            "user": user_space,
            "user_tier": user_space_tier,
            "optimal": optimal_space,
            "optimal_tier": optimal_space_tier,
            "is_optimal": is_space_optimal,
            "verdict": "Optimal" if is_space_optimal else f"Suboptimal (Using more auxiliary space than {optimal_space})",
            "summary": space_summary
        }
    }
