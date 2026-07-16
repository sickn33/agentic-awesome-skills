# HumanEval/91
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def is_bored(S):
    """
    You'll be given a string of words, and your task is to count the number
    of boredoms. A boredom is a sentence that starts with the word "I".
    Sentences are delimited by '.', '?' or '!'.
   
    For example:
    >>> is_bored("Hello world")
    0
    >>> is_bored("The sky is blue. The sun is shining. I love this weather")
    1
    """
    import re
    
    if not S:
        return 0
    
    sentences = re.split(r'[.?!]', S)
    count = 0
    
    for sentence in sentences:
        stripped = sentence.lstrip()
        if stripped == "I" or stripped.startswith("I "):
            count += 1
    
    return count