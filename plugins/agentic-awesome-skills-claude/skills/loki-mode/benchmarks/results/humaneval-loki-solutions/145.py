# HumanEval/145
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def order_by_points(nums):
    """
    Write a function which sorts the given list of integers
    in ascending order according to the sum of their digits.
    Note: if there are several items with similar sum of their digits,
    order them based on their index in original list.

    For example:
    >>> order_by_points([1, 11, -1, -11, -12]) == [-1, -11, 1, -12, 11]
    >>> order_by_points([]) == []
    """
    def digit_sum(n):
        s = str(n)
        if s[0] == '-':
            return -int(s[1]) + sum(int(d) for d in s[2:])
        else:
            return sum(int(d) for d in s)
    
    return sorted(nums, key=digit_sum)