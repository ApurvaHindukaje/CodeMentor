import os
import sys
import json
import urllib.request
from typing import List, Dict, Any

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal, engine, Base
from app.models.problem import Problem

DATASET_URL = "https://huggingface.co/datasets/newfacade/LeetCodeDataset/resolve/main/LeetCodeDataset-train.jsonl"
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "leetcode_500.json")


def clean_title(task_id: str) -> str:
    # Transform kebab-case to title case with special handling
    words = task_id.replace("-", " ").split()
    capitalized = []
    for w in words:
        if w.lower() in ["i", "ii", "iii", "iv", "v", "vi"]:
            capitalized.append(w.upper())
        elif w.lower() in ["to", "and", "of", "in", "with", "a", "an", "the", "or", "for"]:
            capitalized.append(w.lower())
        else:
            capitalized.append(w.capitalize())
    title = " ".join(capitalized)
    if title:
        title = title[0].upper() + title[1:]
    return title


def format_starter_code(starter_code: str) -> str:
    cleaned = starter_code.strip()
    if not cleaned:
        return "class Solution:\n    def solution(self):\n        pass\n"
    # If starter code doesn't end with a body, add pass
    lines = cleaned.split("\n")
    if lines[-1].strip().endswith(":"):
        indent = "        " if "class" in cleaned else "    "
        cleaned += f"\n{indent}# Write your code here\n{indent}pass"
    return cleaned + "\n"


def fetch_and_save_dataset(target_count: int = 500) -> List[Dict[str, Any]]:
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)

    if os.path.exists(CACHE_FILE):
        print(f"Loading cached dataset from {CACHE_FILE}...")
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            problems = json.load(f)
            if len(problems) >= target_count:
                print(f"Loaded {len(problems)} problems from cache.")
                return problems[:target_count]

    print(f"Streaming and filtering {target_count}+ problems from Hugging Face LeetCodeDataset...")
    req = urllib.request.Request(DATASET_URL, headers={"User-Agent": "Mozilla/5.0"})
    
    extracted: List[Dict[str, Any]] = []
    
    with urllib.request.urlopen(req) as resp:
        for line in resp:
            try:
                raw = json.loads(line.decode("utf-8"))
            except Exception:
                continue

            desc = raw.get("problem_description", "").strip()
            starter = raw.get("starter_code", "").strip()
            ios = raw.get("input_output", [])
            task_id = raw.get("task_id", "")
            diff = raw.get("difficulty", "Medium")
            tags = raw.get("tags", [])

            # Filter out problems requiring complex linked list / binary tree pointer serialization
            if not desc or not starter or len(ios) < 2:
                continue
            if "ListNode" in starter or "TreeNode" in starter or "Node" in starter:
                continue

            # Format test cases
            sample_tc = ios[0]
            sample_in = str(sample_tc.get("input", "")).strip()
            sample_out = str(sample_tc.get("output", "")).strip()

            hidden_cases = []
            for tc in ios[:5]:  # Use up to 5 comprehensive test cases
                hidden_cases.append({
                    "input": str(tc.get("input", "")).strip(),
                    "expected_output": str(tc.get("output", "")).strip()
                })

            item = {
                "title": clean_title(task_id),
                "description": desc,
                "difficulty": diff,
                "topics": tags if isinstance(tags, list) else [tags],
                "sample_input": sample_in,
                "sample_output": sample_out,
                "starter_code": format_starter_code(starter),
                "hidden_test_cases": hidden_cases
            }
            extracted.append(item)

            if len(extracted) >= target_count:
                break

    print(f"Successfully processed {len(extracted)} high-quality problems.")
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(extracted, f, indent=2)
    print(f"Saved dataset cache to {CACHE_FILE}.")

    return extracted


def seed_database(problems: List[Dict[str, Any]], clear_existing: bool = True):
    print("Connecting to database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if clear_existing:
            count = db.query(Problem).count()
            print(f"Clearing {count} existing problems...")
            db.query(Problem).delete()
            db.commit()

        print(f"Seeding {len(problems)} problems into the database...")
        db_problems = [Problem(**p) for p in problems]
        db.bulk_save_objects(db_problems)
        db.commit()

        total = db.query(Problem).count()
        print(f"🎉 Database successfully seeded with {total} problems!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    count_arg = 500
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        count_arg = int(sys.argv[1])

    problems_list = fetch_and_save_dataset(target_count=count_arg)
    seed_database(problems_list, clear_existing=True)
