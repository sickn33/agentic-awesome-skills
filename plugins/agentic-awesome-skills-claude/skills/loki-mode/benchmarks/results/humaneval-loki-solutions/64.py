# HumanEval/64
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def vowels_count(s):
    """Write a function vowels_count which takes a string representing
    a word as input and returns the number of vowels in the string.
    Vowels in this case are 'a', 'e', 'i', 'o', 'u'. Here, 'y' is also a
    vowel, but only when it is at the end of the given word.

    Example:
    >>> vowels_count("abcde")
    2
    >>> vowels_count("ACEDY")
    3
    """
    vowels = "aeiou"
    s_lower = s.lower()
    count = 0
    
    for char in s_lower:
        if char in vowels:
            count += 1
    
    if s_lower and s_lower[-1] == 'y':
        count += 1
    
    return count