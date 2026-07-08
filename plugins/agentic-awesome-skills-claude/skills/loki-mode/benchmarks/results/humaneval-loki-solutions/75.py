# HumanEval/75
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def is_multiply_prime(a):
    """Write a function that returns true if the given number is the multiplication of 3 prime numbers
    and false otherwise.
    Knowing that (a) is less then 100. 
    Example:
    is_multiply_prime(30) == True
    30 = 2 * 3 * 5
    """
    def is_prime(n):
        if n < 2:
            return False
        if n == 2:
            return True
        if n % 2 == 0:
            return False
        for i in range(3, int(n**0.5) + 1, 2):
            if n % i == 0:
                return False
        return True
    
    if a < 8:
        return False
    
    prime_factor_count = 0
    temp = a
    
    for p in range(2, a + 1):
        if is_prime(p):
            while temp % p == 0:
                prime_factor_count += 1
                temp = temp // p
                if prime_factor_count > 3:
                    return False
        if temp == 1:
            break
    
    return prime_factor_count == 3