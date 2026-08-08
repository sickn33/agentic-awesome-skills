# HumanEval/59
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def largest_prime_factor(n: int):
    """Return the largest prime factor of n. Assume n > 1 and is not a prime.
    >>> largest_prime_factor(13195)
    29
    >>> largest_prime_factor(2048)
    2
    """
    largest = 1
    
    # Divide out all factors of 2
    while n % 2 == 0:
        largest = 2
        n //= 2
    
    # Check odd factors starting from 3
    factor = 3
    while factor * factor <= n:
        while n % factor == 0:
            largest = factor
            n //= factor
        factor += 2
    
    # If n is still greater than 1, it's a prime factor
    if n > 1:
        largest = n
    
    return largest