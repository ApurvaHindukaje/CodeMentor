import sys
import io
import json
import subprocess
import time
from typing import List, Dict, Any, Optional

RUNNER_HARNESS_TEMPLATE = '''
import sys
import io
import json
import math
import collections
import inspect
from typing import *

_orig_stdin = sys.stdin
_orig_stdout = sys.stdout
sys.stdin = io.StringIO("")
sys.stdout = io.StringIO()

__USER_CODE_PLACEHOLDER__

sys.stdin = _orig_stdin
sys.stdout = _orig_stdout

test_cases = __TEST_CASES_PLACEHOLDER__
entry_name = __ENTRY_NAME_PLACEHOLDER__

def is_user_func(name, obj):
    if not callable(obj):
        return False
    if name.startswith("_") or name in ("parse_test_input", "compare_outputs", "is_user_func"):
        return False
    mod = getattr(obj, "__module__", "") or ""
    if mod in ("typing", "builtins", "collections", "math", "sys", "io", "json"):
        return False
    if inspect.isclass(obj):
        return False
    return inspect.isfunction(obj) or inspect.ismethod(obj)

def parse_test_input(input_str):
    s = str(input_str).strip()
    if not s:
        return (), {}

    # 1. Try evaluating as comma-separated keyword arguments: dict(s="aab") or dict(nums=[3,3], target=6)
    try:
        kw = eval(f"dict({s})", {"__builtins__": __builtins__})
        if isinstance(kw, dict) and kw:
            return (), kw
    except Exception:
        pass

    # 2. Try evaluating directly as Python expression: "aab", [1, 2, 3], ([1, 2], 3), 121
    try:
        val = eval(s, {"__builtins__": __builtins__})
        if isinstance(val, tuple):
            return val, {}
        return (val,), {}
    except Exception:
        pass

    # 3. Try JSON decoding
    try:
        val = json.loads(s)
        if isinstance(val, dict):
            return (), val
        if isinstance(val, list):
            return (val,), {}
        return (val,), {}
    except Exception:
        pass

    # 4. Try multiline assignment execution: a = 1\\nb = 2
    try:
        loc = {}
        exec(s, {"__builtins__": __builtins__}, loc)
        if loc:
            return (), loc
    except Exception:
        pass

    # Fallback: pass as raw string argument
    return (s,), {}


def compare_outputs(actual_val, expected_str):
    if expected_str is None or str(expected_str).strip() == "":
        return True, str(actual_val)
    exp = str(expected_str).strip()

    if isinstance(actual_val, bool):
        act_str = "true" if actual_val else "false"
    elif actual_val is None:
        act_str = "null"
    elif isinstance(actual_val, (list, dict, tuple)):
        try:
            act_str = json.dumps(actual_val)
        except Exception:
            act_str = str(actual_val)
    else:
        act_str = str(actual_val).strip()

    if act_str == exp or act_str.lower() == exp.lower():
        return True, act_str

    try:
        act_obj = json.loads(act_str)
        exp_obj = json.loads(exp)
        if act_obj == exp_obj:
            return True, act_str
        if isinstance(act_obj, list) and isinstance(exp_obj, list):
            if sorted([str(x) for x in act_obj]) == sorted([str(x) for x in exp_obj]):
                return True, act_str
    except Exception:
        pass

    strip_chars = chr(34) + chr(39)
    if act_str.strip(strip_chars) == exp.strip(strip_chars):
        return True, act_str

    return False, act_str


# Resolve callable target: Solution class method or standalone function
target_func = None
sol_instance = None

if "Solution" in locals() and isinstance(locals()["Solution"], type):
    try:
        sol_instance = locals()["Solution"]()
        if entry_name and hasattr(sol_instance, entry_name) and callable(getattr(sol_instance, entry_name)):
            target_func = getattr(sol_instance, entry_name)
        if not target_func:
            cls_methods = [
                getattr(sol_instance, k)
                for k, v in locals()["Solution"].__dict__.items()
                if callable(v) and not k.startswith("_") and hasattr(sol_instance, k)
            ]
            if cls_methods:
                target_func = cls_methods[0]
        if not target_func:
            methods = [
                getattr(sol_instance, m)
                for m in dir(sol_instance)
                if callable(getattr(sol_instance, m)) and not m.startswith("_")
            ]
            if methods:
                target_func = methods[0]
    except Exception:
        pass

if not target_func:
    if entry_name and entry_name in locals() and is_user_func(entry_name, locals()[entry_name]):
        target_func = locals()[entry_name]
    else:
        user_funcs = [
            obj for name, obj in list(locals().items())
            if is_user_func(name, obj)
        ]
        if user_funcs:
            target_func = user_funcs[-1]

results = []
for idx, tc in enumerate(test_cases):
    tc_input = str(tc.get("input", "")).strip()
    expected = str(tc.get("expected_output", "")).strip() if tc.get("expected_output") is not None else ""

    old_stdout = sys.stdout
    buffer = io.StringIO()
    sys.stdout = buffer

    try:
        if target_func:
            args, kwargs = parse_test_input(tc_input)
            try:
                actual_val = target_func(*args, **kwargs)
            except TypeError as te:
                if kwargs and not args:
                    actual_val = target_func(*kwargs.values())
                elif not args and not kwargs:
                    sig = inspect.signature(target_func)
                    req = [
                        p.name for p in sig.parameters.values()
                        if p.default == inspect.Parameter.empty and p.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
                    ]
                    if req:
                        raise ValueError(f"Test case input is empty. '{target_func.__name__}' expects argument(s): {', '.join(req)}.")
                    raise te
                else:
                    raise te
            passed, actual_str = compare_outputs(actual_val, expected)
        else:
            # Standard input script execution
            old_stdin = sys.stdin
            sys.stdin = io.StringIO(tc_input)
            loc = {}
            exec(__USER_CODE_RAW_PLACEHOLDER__, {"__builtins__": __builtins__}, loc)
            sys.stdin = old_stdin
            out = buffer.getvalue().strip()
            passed, actual_str = compare_outputs(out, expected)

        sys.stdout = old_stdout
        results.append({
            "test_case": idx + 1,
            "input": tc_input,
            "expected": expected,
            "actual": actual_str,
            "stdout": buffer.getvalue(),
            "passed": passed
        })
    except Exception as e:
        sys.stdout = old_stdout
        results.append({
            "test_case": idx + 1,
            "input": tc_input,
            "expected": expected,
            "actual": None,
            "stdout": buffer.getvalue(),
            "error": str(e),
            "passed": False
        })

print(json.dumps({"results": results}))
'''


def execute_python_code(
    user_code: str,
    test_cases: List[Dict[str, Any]],
    timeout_seconds: float = 3.0,
    entry_point: Optional[str] = None
) -> Dict[str, Any]:
    start_time = time.time()

    # Check syntax before spawning process
    try:
        compile(user_code, "<user_code>", "exec")
    except SyntaxError as se:
        return {
            "status": "Compile Error",
            "passed": False,
            "passed_count": 0,
            "total_count": len(test_cases),
            "execution_time_ms": 0,
            "error_message": f"SyntaxError on line {se.lineno}: {se.msg}",
            "details": []
        }

    script = (
        RUNNER_HARNESS_TEMPLATE
        .replace("__USER_CODE_PLACEHOLDER__", user_code)
        .replace("__USER_CODE_RAW_PLACEHOLDER__", repr(user_code))
        .replace("__TEST_CASES_PLACEHOLDER__", json.dumps(test_cases))
        .replace("__ENTRY_NAME_PLACEHOLDER__", repr(entry_point) if entry_point else "None")
    )

    try:
        proc = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            timeout=timeout_seconds
        )
        elapsed_ms = int((time.time() - start_time) * 1000)

        if proc.returncode != 0:
            err_msg = proc.stderr.strip() or proc.stdout.strip() or "Execution exited with error"
            return {
                "status": "Runtime Error",
                "passed": False,
                "passed_count": 0,
                "total_count": len(test_cases),
                "execution_time_ms": elapsed_ms,
                "error_message": err_msg,
                "details": []
            }

        try:
            lines = [l.strip() for l in proc.stdout.strip().splitlines() if l.strip()]
            output_data = json.loads(lines[-1] if lines else "{}")
        except (json.JSONDecodeError, IndexError):
            return {
                "status": "Runtime Error",
                "passed": False,
                "passed_count": 0,
                "total_count": len(test_cases),
                "execution_time_ms": elapsed_ms,
                "error_message": f"Invalid output from runner: {proc.stdout}",
                "details": []
            }

        if "error" in output_data:
            return {
                "status": "Runtime Error",
                "passed": False,
                "passed_count": 0,
                "total_count": len(test_cases),
                "execution_time_ms": elapsed_ms,
                "error_message": output_data["error"],
                "details": []
            }

        results = output_data.get("results", [])
        passed_count = sum(1 for r in results if r.get("passed"))
        all_passed = (passed_count == len(test_cases)) and len(test_cases) > 0

        return {
            "status": "Accepted" if all_passed else "Wrong Answer",
            "passed": all_passed,
            "passed_count": passed_count,
            "total_count": len(test_cases),
            "execution_time_ms": elapsed_ms,
            "error_message": None if all_passed else "One or more test cases failed.",
            "details": results
        }

    except subprocess.TimeoutExpired:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "status": "Time Limit Exceeded",
            "passed": False,
            "passed_count": 0,
            "total_count": len(test_cases),
            "execution_time_ms": elapsed_ms,
            "error_message": f"Code execution exceeded the {timeout_seconds}s time limit.",
            "details": []
        }
    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "status": "Runtime Error",
            "passed": False,
            "passed_count": 0,
            "total_count": len(test_cases),
            "execution_time_ms": elapsed_ms,
            "error_message": str(e),
            "details": []
        }
