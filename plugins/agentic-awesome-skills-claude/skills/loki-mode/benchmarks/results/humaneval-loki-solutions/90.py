# HumanEval/90
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def next_smallest(lst):
    """
    You are given a list of integers.
    Write a function next_smallest() that returns the 2nd smallest element of the list.
    Return None if there is no such element.
    
    next_smallest([1, 2, 3, 4, 5]) == 2
    next_smallest([5, 1, 4, 3, 2]) == 2
    next_smallest([]) == None
    next_smallest([1, 1]) == None
    """
    unique_values = set(lst)
    if len(unique_values) < 2:
        return None
    sorted_unique = sorted(unique_values)
    return sorted_unique[1]