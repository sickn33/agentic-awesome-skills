# HumanEval/39
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def prime_fib(n: int):
    """
    prime_fib returns n-th number that is a Fibonacci number and it's also prime.
    >>> prime_fib(1)
    2
    >>> prime_fib(2)
    3
    >>> prime_fib(3)
    5
    >>> prime_fib(4)
    13
    >>> prime_fib(5)
    89
    """
    def is_prime(num):
        if num < 2:
            return False
        if num == 2:
            return True
        if num % 2 == 0:
            return False
        for i in range(3, int(num ** 0.5) + 1, 2):
            if num % i == 0:
                return False
        return True
    
    count = 0
    fib_prev, fib_curr = 0, 1
    
    while count < n:
        fib_prev, fib_curr = fib_curr, fib_prev + fib_curr
        if is_prime(fib_curr):
            count += 1
    
    return fib_curr