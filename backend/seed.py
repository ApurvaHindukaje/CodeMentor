import os
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal, engine, Base
from app.models.problem import Problem


problems_data = [
    {
        "title": "Two Sum",
        "description": "Given an array of integers and a target, return the indices of two numbers that add up to the target.",
        "difficulty": "Easy",
        "topics": ["Array", "Hash Table"],
        "sample_input": "[2, 7, 11, 15], target = 9",
        "sample_output": "[0, 1]",
        "starter_code": "def two_sum(nums, target):\n    # Write your code here\n    pass",
        "hidden_test_cases": [
            {
                "input": "[3, 2, 4], target = 6",
                "expected_output": "[1, 2]"
            },
            {
                "input": "[3, 3], target = 6",
                "expected_output": "[0, 1]"
            }
        ]
    },
    {
        "title": "Reverse String",
        "description": "Given a string, return the string in reverse order.",
        "difficulty": "Easy",
        "topics": ["String"],
        "sample_input": "hello",
        "sample_output": "olleh",
        "starter_code": "def reverse_string(s):\n    # Write your code here\n    pass",
        "hidden_test_cases": [
            {
                "input": "world",
                "expected_output": "dlrow"
            },
            {
                "input": "CodeMentor",
                "expected_output": "rotneMedoC"
            }
        ]
    },
    {
        "title": "Find Maximum Element",
        "description": "Given an array of integers, find the maximum element.",
        "difficulty": "Easy",
        "topics": ["Array"],
        "sample_input": "[3, 7, 2, 9, 5]",
        "sample_output": "9",
        "starter_code": "def find_max(nums):\n    # Write your code here\n    pass",
        "hidden_test_cases": [
            {
                "input": "[1, 5, 3, 2]",
                "expected_output": "5"
            },
            {
                "input": "[-5, -2, -10]",
                "expected_output": "-2"
            }
        ]
    },
    {
        "title": "Valid Palindrome",
        "description": "Given a string, return true if it is a palindrome, false otherwise.",
        "difficulty": "Easy",
        "topics": ["String", "Two Pointers"],
        "sample_input": "racecar",
        "sample_output": "True",
        "starter_code": "def is_palindrome(s):\n    # Write your code here\n    pass",
        "hidden_test_cases": [
            {
                "input": "hello",
                "expected_output": "False"
            },
            {
                "input": "madam",
                "expected_output": "True"
            }
        ]
    },
    {
        "title": "FizzBuzz",
        "description": "Given an integer n, return a list of strings from 1 to n where multiples of 3 are 'Fizz', multiples of 5 are 'Buzz', and multiples of both are 'FizzBuzz'.",
        "difficulty": "Easy",
        "topics": ["Math", "Simulation"],
        "sample_input": "n = 5",
        "sample_output": "['1', '2', 'Fizz', '4', 'Buzz']",
        "starter_code": "def fizz_buzz(n):\n    # Write your code here\n    pass",
        "hidden_test_cases": [
            {
                "input": "n = 3",
                "expected_output": "['1', '2', 'Fizz']"
            },
            {
                "input": "n = 15",
                "expected_output": "['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz']"
            }
        ]
    },
    {
        "title": "Count Vowels",
        "description": "Given a string s, return the total count of vowels (a, e, i, o, u, case-insensitive).",
        "difficulty": "Easy",
        "topics": ["String"],
        "sample_input": "'CodeMentor'",
        "sample_output": "4",
        "starter_code": "def count_vowels(s):\n    # Write your code here\n    pass",
        "hidden_test_cases": [
            {
                "input": "'sky'",
                "expected_output": "0"
            },
            {
                "input": "'AEIOU'",
                "expected_output": "5"
            }
        ]
    }
]


def seed_database():
    print("Connecting to PostgreSQL and creating tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if 500-problem dataset cache exists
        cache_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "leetcode_500.json")
        data_to_seed = problems_data

        if os.path.exists(cache_file):
            try:
                import json
                with open(cache_file, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                    if cached and isinstance(cached, list):
                        data_to_seed = cached
                        print(f"Using {len(cached)} problems from {cache_file}")
            except Exception as read_err:
                print(f"Warning reading cache file: {read_err}. Using default problem set.")

        # Clear existing problems to avoid duplicates on re-seed
        existing_count = db.query(Problem).count()
        if existing_count > 0:
            print(f"Clearing {existing_count} existing problems...")
            db.query(Problem).delete()
            db.commit()

        print(f"Seeding {len(data_to_seed)} problems...")
        problems_to_insert = [
            Problem(
                title=p["title"],
                description=p["description"],
                difficulty=p["difficulty"],
                topics=p["topics"],
                sample_input=p.get("sample_input"),
                sample_output=p.get("sample_output"),
                starter_code=p.get("starter_code"),
                hidden_test_cases=p.get("hidden_test_cases", []),
                optimal_time_complexity=p.get("optimal_time_complexity", "O(N)"),
                optimal_space_complexity=p.get("optimal_space_complexity", "O(1)"),
                complexity_notes=p.get("complexity_notes", "Optimal solution")
            )
            for p in data_to_seed
        ]
        db.bulk_save_objects(problems_to_insert)
        db.commit()
        print(f"🎉 Successfully seeded {len(data_to_seed)} problems into database!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()