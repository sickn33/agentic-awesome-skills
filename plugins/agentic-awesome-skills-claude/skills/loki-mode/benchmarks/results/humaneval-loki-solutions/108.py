# HumanEval/108
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def count_nums(arr):
    """
    Write a function count_nums which takes an array of integers and returns
    the number of elements which has a sum of digits > 0.
    If a number is negative, then its first signed digit will be negative:
    e.g. -123 has signed digits -1, 2, and 3.
    >>> count_nums([]) == 0
    >>> count_nums([-1, 11, -11]) == 1
    >>> count_nums([1, 1, 2]) == 3
    """
    count = 0
    for num in arr:
        if num == 0:
            continue
        is_negative = num < 0
        num = abs(num)
        digits = [int(d) for d in str(num)]
        if is_negative:
            digits[0] = -digits[0]
        if sum(digits) > 0:
            count += 1
    return count