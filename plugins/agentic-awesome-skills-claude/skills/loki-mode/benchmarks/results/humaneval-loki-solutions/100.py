# HumanEval/100
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def make_a_pile(n):
    """
    Given a positive integer n, you have to make a pile of n levels of stones.
    The first level has n stones.
    The number of stones in the next level is:
        - the next odd number if n is odd.
        - the next even number if n is even.
    Return the number of stones in each level in a list, where element at index
    i represents the number of stones in the level (i+1).

    Examples:
    >>> make_a_pile(3)
    [3, 5, 7]
    """
    result = [n]
    for _ in range(n - 1):
        result.append(result[-1] + 2)
    return result