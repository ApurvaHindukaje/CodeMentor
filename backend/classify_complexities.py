import json
import os
import re

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "leetcode_500.json")

CANONICAL_PROBLEMS = {
    "two sum": ("O(N)", "O(N)", "Single pass with hash map tracking complements in O(1) amortized lookup"),
    "add two numbers": ("O(max(N, M))", "O(max(N, M))", "Linear iteration creating output sum nodes"),
    "longest substring without repeating characters": ("O(N)", "O(N)", "Sliding window with hash map tracking last seen character indices"),
    "median of two sorted arrays": ("O(log(min(M, N)))", "O(1)", "Binary search partitioning across the smaller array in O(log(min(M, N)))"),
    "longest palindromic substring": ("O(N^2)", "O(1)", "Expand around center from each index in O(1) space"),
    "zigzag conversion": ("O(N)", "O(N)", "Row-by-row character collection"),
    "reverse integer": ("O(log N)", "O(1)", "Modulo arithmetic extracting base-10 digits"),
    "string to integer atoi": ("O(N)", "O(1)", "Single pass character parsing with integer overflow clamp"),
    "palindrome number": ("O(log N)", "O(1)", "Reversing half of the integer using modulo arithmetic"),
    "regular expression matching": ("O(N * M)", "O(N * M)", "2D dynamic programming grid or memoized recursion"),
    "container with most water": ("O(N)", "O(1)", "Two pointers shrinking inward based on limiting height"),
    "3sum": ("O(N^2)", "O(1)", "Sort in O(N log N) then two-pointer scan for each element in O(1) auxiliary space"),
    "3sum closest": ("O(N^2)", "O(1)", "Sort then two-pointer scan tracking closest distance"),
    "letter combinations of a phone number": ("O(4^N)", "O(N)", "Backtracking tree exploration of keypad combinations"),
    "4sum": ("O(N^3)", "O(1)", "Sort then nested two-pointer scan"),
    "remove nth node from end of list": ("O(N)", "O(1)", "Fast and slow pointer technique with single pass"),
    "valid parentheses": ("O(N)", "O(N)", "Stack storing opening brackets to match with closing brackets"),
    "merge two sorted lists": ("O(N + M)", "O(1)", "Linear two-pointer splice in-place"),
    "generate parentheses": ("O(4^N / sqrt(N))", "O(N)", "Catalan backtracking with recursion stack"),
    "merge k sorted lists": ("O(N log K)", "O(K)", "Min-heap priority queue tracking heads of K lists"),
    "swap nodes in pairs": ("O(N)", "O(1)", "In-place pointer rewiring"),
    "reverse nodes in k group": ("O(N)", "O(1)", "In-place iterative reversal per group"),
    "remove duplicates from sorted array": ("O(N)", "O(1)", "Two pointers overwriting duplicates in-place"),
    "remove element": ("O(N)", "O(1)", "Two pointers overwriting target elements in-place"),
    "find the index of the first occurrence in a string": ("O(N)", "O(1)", "KMP or rolling hash algorithm"),
    "divide two integers": ("O(log N)", "O(1)", "Bitwise shift exponential doubling"),
    "search in rotated sorted array": ("O(log N)", "O(1)", "Modified binary search determining sorted half"),
    "find first and last position of element in sorted array": ("O(log N)", "O(1)", "Double binary search for lower and upper bounds"),
    "search insert position": ("O(log N)", "O(1)", "Standard binary search bound check"),
    "valid sudoku": ("O(1)", "O(1)", "Fixed 9x9 board bitmask/set check (81 cells)"),
    "sudoku solver": ("O(9^81)", "O(81)", "Backtracking search with constraint propagation"),
    "count and say": ("O(2^N)", "O(2^N)", "Run-length string encoding sequence generation"),
    "combination sum": ("O(2^N)", "O(target)", "Backtracking recursion tree exploration"),
    "trapping rain water": ("O(N)", "O(1)", "Two pointers with left_max and right_max bounds in O(1) space"),
    "multiply strings": ("O(N * M)", "O(N + M)", "Simulated column-by-column multiplication array"),
    "permutations": ("O(N * N!)", "O(N)", "Backtracking swap exploration"),
    "rotate image": ("O(N^2)", "O(1)", "Transpose matrix and reverse each row in-place"),
    "group anagrams": ("O(N * K)", "O(N * K)", "Hash table mapping sorted characters or frequency tuples to word groups"),
    "powx n": ("O(log N)", "O(log N)", "Binary exponentiation doubling"),
    "maximum subarray": ("O(N)", "O(1)", "Kadane's algorithm tracking current and global max in O(1) space"),
    "spiral matrix": ("O(N * M)", "O(1)", "Four boundary pointers tracking perimeter traversal in-place"),
    "jump game": ("O(N)", "O(1)", "Greedy maximum reachable index tracking"),
    "merge intervals": ("O(N log N)", "O(N)", "Sort intervals then single pass merge"),
    "unique paths": ("O(N * M)", "O(N)", "1D DP rolling array reduction from 2D grid"),
    "climbing stairs": ("O(N)", "O(1)", "Fibonacci sequence progression with 2 variables in O(1) space"),
    "edit distance": ("O(N * M)", "O(min(N, M))", "Dynamic programming with rolling row space optimization"),
    "set matrix zeroes": ("O(N * M)", "O(1)", "Using first row and first column as in-place zero flags"),
    "search a 2d matrix": ("O(log(N * M))", "O(1)", "Binary search treating 2D matrix as flattened 1D array"),
    "sort colors": ("O(N)", "O(1)", "Dutch National Flag 3-pointer partition in-place"),
    "minimum window substring": ("O(N)", "O(K)", "Sliding window frequency matching with two pointers"),
    "subsets": ("O(2^N)", "O(N)", "Cascading or backtracking bit manipulation"),
    "word search": ("O(N * M * 4^L)", "O(L)", "DFS backtracking over grid with visited marking"),
    "largest rectangle in histogram": ("O(N)", "O(N)", "Monotonic increasing stack tracking index heights"),
    "maximal rectangle": ("O(N * M)", "O(M)", "Monotonic stack over histogram rows"),
    "binary tree level order traversal": ("O(N)", "O(N)", "BFS queue traversal level by level"),
    "best time to buy and sell stock": ("O(N)", "O(1)", "Single pass tracking minimum buy price and maximum profit in O(1) space"),
    "word break": ("O(N^2)", "O(N)", "DP array checking dictionary prefix matches"),
    "lru cache": ("O(1)", "O(N)", "Doubly linked list + hash map for O(1) get and put"),
    "min stack": ("O(1)", "O(N)", "Auxiliary tracking stack for O(1) minimum retrieval"),
    "number of islands": ("O(N * M)", "O(N * M)", "DFS/BFS flood fill over grid"),
    "reverse linked list": ("O(N)", "O(1)", "Iterative 3-pointer reversal in-place"),
    "contains duplicate": ("O(N)", "O(N)", "Hash set element membership tracking"),
    "product of array except self": ("O(N)", "O(1)", "Left and right prefix product pass in result array"),
    "sliding window maximum": ("O(N)", "O(K)", "Monotonic deque storing candidate indices"),
    "coin change": ("O(amount * N)", "O(amount)", "1D dynamic programming array tracking minimum coins"),
    "top k frequent elements": ("O(N)", "O(N)", "Bucket sort frequency indexing or quickselect"),
    "daily temperatures": ("O(N)", "O(N)", "Monotonic decreasing stack tracking temperatures"),
    "valid anagram": ("O(N)", "O(1)", "Fixed 26-character frequency array in O(1) space"),
}


def classify_problem(title: str, description: str, topics: list, difficulty: str):
    clean_t = re.sub(r'[^a-zA-Z0-9 ]', '', title.lower()).strip()
    clean_t = re.sub(r'\s+', ' ', clean_t)

    # 1. Exact or substring canonical match
    for canon_title, (opt_t, opt_s, note) in CANONICAL_PROBLEMS.items():
        if clean_t == canon_title or clean_t == canon_title.replace(" ", ""):
            return opt_t, opt_s, note

    topics_set = set(t.strip() for t in topics) if isinstance(topics, list) else set()
    desc_lower = description.lower()

    # 2. Algorithmic Topics Heuristics
    if "Binary Search" in topics_set:
        if "Sorting" in topics_set:
            return "O(N log N)", "O(1)", "Sort then binary search query in O(1) space"
        return "O(log N)", "O(1)", "Binary search halving search space per iteration"

    if "Trie" in topics_set:
        return "O(N)", "O(N)", "Trie tree node traversal and prefix allocation"

    if "Monotonic Stack" in topics_set or "Stack" in topics_set:
        return "O(N)", "O(N)", "Stack maintains elements in monotonic order for O(1) amortized processing"

    if "Backtracking" in topics_set:
        return "O(2^N)", "O(N)", "Explores exponential state space with recursion call stack"

    if "Breadth-First Search" in topics_set or "Depth-First Search" in topics_set or "Graph" in topics_set:
        if "Matrix" in topics_set or "Grid" in topics_set:
            return "O(N * M)", "O(N * M)", "Graph traversal (BFS/DFS) across grid with visited set / call stack"
        return "O(N)", "O(N)", "Graph/tree traversal visiting each node and edge once with visited memory"

    if "Sliding Window" in topics_set:
        if "Hash Table" in topics_set or "String" in topics_set:
            return "O(N)", "O(N)", "Sliding window with frequency tracking hash table"
        return "O(N)", "O(1)", "Two-pointer sliding window with constant space counters"

    if "Hash Table" in topics_set:
        return "O(N)", "O(N)", "Hash table stores elements for O(1) lookup and complement matching"

    if "Dynamic Programming" in topics_set:
        if "Matrix" in topics_set or "grid" in desc_lower or "2d" in clean_t:
            return "O(N * M)", "O(N)", "2D dynamic programming with rolling 1D space optimization"
        if difficulty == "Hard":
            return "O(N^2)", "O(N)", "Dynamic programming recurrence with memoization table"
        return "O(N)", "O(N)", "Dynamic programming transition tracking state in O(N) auxiliary space"

    if "Two Pointers" in topics_set:
        if "Sorting" in topics_set:
            return "O(N log N)", "O(1)", "Sort input followed by two-pointer traversal in O(1) space"
        return "O(N)", "O(1)", "Two pointers traversing from opposite ends in O(1) auxiliary space"

    if "Sorting" in topics_set:
        return "O(N log N)", "O(1)", "Optimal comparison-based sorting in O(1) auxiliary space"

    if "Bit Manipulation" in topics_set:
        return "O(1)", "O(1)", "Bitwise operations execute in constant O(1) time and space"

    if "Math" in topics_set:
        if difficulty == "Easy":
            return "O(log N)", "O(1)", "Mathematical digit extraction or arithmetic formulation"
        return "O(N)", "O(1)", "Mathematical algorithm with constant memory"

    if "String" in topics_set and ("anagram" in desc_lower or "frequency" in desc_lower or "duplicate" in desc_lower):
        return "O(N)", "O(N)", "Character frequency tracking with auxiliary table"

    # Default general array / simulation
    return "O(N)", "O(1)", "Linear scan through input with constant O(1) pointers"


def update_dataset_and_db():
    print(f"Loading {DATA_FILE}...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        problems = json.load(f)

    print(f"Classifying {len(problems)} problems...")
    space_n_count = 0
    space_1_count = 0

    for p in problems:
        opt_t, opt_s, note = classify_problem(
            p["title"],
            p.get("description", ""),
            p.get("topics", []),
            p.get("difficulty", "Medium")
        )
        p["optimal_time_complexity"] = opt_t
        p["optimal_space_complexity"] = opt_s
        p["complexity_notes"] = note

        if "O(N)" in opt_s:
            space_n_count += 1
        elif "O(1)" in opt_s:
            space_1_count += 1

    print(f"Classification complete:")
    print(f"  O(1) Space targets: {space_1_count}")
    print(f"  O(N) Space targets: {space_n_count}")
    print(f"  Other Space targets: {len(problems) - space_1_count - space_n_count}")

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(problems, f, indent=2)
    print(f"Saved updated dataset to {DATA_FILE}!")

    return problems


if __name__ == "__main__":
    update_dataset_and_db()
