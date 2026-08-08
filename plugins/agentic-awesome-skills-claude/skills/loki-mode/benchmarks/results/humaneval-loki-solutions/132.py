# HumanEval/132
# Loki Mode Multi-Agent Solution
# Attempts: 2
# Passed: True

def is_nested(string):
    '''
    Create a function that takes a string as input which contains only square brackets.
    The function should return True if and only if there is a valid subsequence of brackets 
    where at least one bracket in the subsequence is nested.

    is_nested('[[]]') ➞ True
    is_nested('[]]]]]]][[[[[]') ➞ False
    is_nested('[][]') ➞ False
    is_nested('[]') ➞ False
    is_nested('[[][]]') ➞ True
    is_nested('[[]][[') ➞ True
    '''
    depth = 0
    max_depth = 0
    for char in string:
        if char == '[':
            depth += 1
            max_depth = max(max_depth, depth)
        elif char == ']':
            if depth > 0:
                depth -= 1
                if depth == 0 and max_depth >= 2:
                    return True
                if depth == 0:
                    max_depth = 0
    return False