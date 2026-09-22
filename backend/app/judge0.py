import sys
import json
import subprocess
import time
from typing import List, Dict, Any

RUNNER_HARNESS_TEMPLATE = '''
import sys
import io
import json
import math
import collections
from typing import *

# Inject user code
__USER_CODE_PLACEHOLDER__

test_cases = __TEST_CASES_PLACEHOLDER__
results = []

def normalize_output(val):
    if isinstance(val, (list, tuple)):
        return str(list(val))
    return str(val)

# Find user defined function or Solution class method
target_func = None
if "Solution" in locals() and isinstance(locals()["Solution"], type):
    try:
        sol_instance = locals()["Solution"]()
        methods = [getattr(sol_instance, m) for m in dir(sol_instance) if callable(getattr(sol_instance, m)) and not m.startswith("_")]
        if methods:
            target_func = methods[0]
    except Exception:
        pass

if not target_func:
    user_funcs = [obj for name, obj in list(locals().items()) if callable(obj) and not name.startswith("__") and name != "normalize_output"]
    if not user_funcs:
        print(json.dumps({"error": "No callable function found in code. Please define your function."}))
        sys.exit(0)
    target_func = user_funcs[-1]

for idx, tc in enumerate(test_cases):
    tc_input = str(tc.get("input", "")).strip()
    expected = str(tc.get("expected_output", "")).strip() if tc.get("expected_output") is not None else ""
    
    old_stdout = sys.stdout
    buffer = io.StringIO()
    sys.stdout = buffer
    
    try:
        try:
            actual_val = eval(f"target_func({tc_input})", {"target_func": target_func, "__builtins__": __builtins__})
        except (NameError, SyntaxError):
            actual_val = target_func(tc_input)

        actual_str = normalize_output(actual_val).strip()
        sys.stdout = old_stdout
        captured_stdout = buffer.getvalue()
        
        if expected:
            passed = (actual_str == expected or 
                      actual_str.replace(" ", "") == expected.replace(" ", "") or
                      actual_str.lower() == expected.lower())
        else:
            passed = True
        
        results.append({
            "test_case": idx + 1,
            "input": tc_input,
            "expected": expected,
            "actual": actual_str,
            "stdout": captured_stdout,
            "passed": passed
        })
    except Exception as e:
        sys.stdout = old_stdout
        captured_stdout = buffer.getvalue()
        results.append({
            "test_case": idx + 1,
            "input": tc_input,
            "expected": expected,
            "actual": None,
            "stdout": captured_stdout,
            "error": str(e),
            "passed": False
        })

print(json.dumps({"results": results}))
'''


def execute_python_code(user_code: str, test_cases: List[Dict[str, Any]], timeout_seconds: float = 3.0) -> Dict[str, Any]:
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

    script = RUNNER_HARNESS_TEMPLATE.replace(
        "__USER_CODE_PLACEHOLDER__", user_code
    ).replace(
        "__TEST_CASES_PLACEHOLDER__", json.dumps(test_cases)
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
            output_data = json.loads(proc.stdout.strip())
        except json.JSONDecodeError:
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
