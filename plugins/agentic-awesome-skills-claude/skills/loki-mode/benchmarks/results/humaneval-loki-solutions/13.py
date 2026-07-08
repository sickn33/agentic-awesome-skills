# HumanEval/13
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def greatest_common_divisor(a: int, b: int) -> int:
    """ Return a greatest common divisor of two integers a and b
    >>> greatest_common_divisor(3, 5)
    1
    >>> greatest_common_divisor(25, 15)
    5
    """
    a = abs(a)
    b = abs(b)
    while b:
        a, b = b, a % b
    return a