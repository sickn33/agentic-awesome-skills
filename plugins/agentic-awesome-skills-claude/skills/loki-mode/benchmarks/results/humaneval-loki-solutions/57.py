# HumanEval/57
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def monotonic(l: list):
    """Return True is list elements are monotonically increasing or decreasing.
    >>> monotonic([1, 2, 4, 20])
    True
    >>> monotonic([1, 20, 4, 10])
    False
    >>> monotonic([4, 1, 0, -10])
    True
    """
    if len(l) <= 1:
        return True
    
    increasing = True
    decreasing = True
    
    for i in range(1, len(l)):
        if l[i] > l[i - 1]:
            decreasing = False
        if l[i] < l[i - 1]:
            increasing = False
    
    return increasing or decreasing