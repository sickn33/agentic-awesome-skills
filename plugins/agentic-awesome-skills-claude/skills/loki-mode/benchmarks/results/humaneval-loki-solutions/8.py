# HumanEval/8
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

from typing import List, Tuple


def sum_product(numbers: List[int]) -> Tuple[int, int]:
    """ For a given list of integers, return a tuple consisting of a sum and a product of all the integers in a list.
    Empty sum should be equal to 0 and empty product should be equal to 1.
    >>> sum_product([])
    (0, 1)
    >>> sum_product([1, 2, 3, 4])
    (10, 24)
    """
    total_sum = 0
    total_product = 1
    
    for num in numbers:
        total_sum += num
        total_product *= num
    
    return (total_sum, total_product)