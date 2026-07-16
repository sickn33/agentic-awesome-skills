# HumanEval/104
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def unique_digits(x):
    """Given a list of positive integers x. return a sorted list of all 
    elements that hasn't any even digit.

    Note: Returned list should be sorted in increasing order.
    
    For example:
    >>> unique_digits([15, 33, 1422, 1])
    [1, 15, 33]
    >>> unique_digits([152, 323, 1422, 10])
    []
    """
    even_digits = set("02468")
    result = []
    for num in x:
        if not any(d in even_digits for d in str(num)):
            result.append(num)
    return sorted(result)