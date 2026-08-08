# HumanEval/11
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

from typing import List


def string_xor(a: str, b: str) -> str:
    """ Input are two strings a and b consisting only of 1s and 0s.
    Perform binary XOR on these inputs and return result also as a string.
    >>> string_xor('010', '110')
    '100'
    """
    result = []
    for char_a, char_b in zip(a, b):
        if char_a == char_b:
            result.append('0')
        else:
            result.append('1')
    return ''.join(result)