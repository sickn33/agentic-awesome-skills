# HumanEval/32
# Loki Mode Multi-Agent Solution
# Attempts: 3
# Passed: False

def find_zero(xs: list):
    """ xs are coefficients of a polynomial.
    find_zero find x such that poly(x) = 0.
    find_zero returns only only zero point, even if there are many.
    Moreover, find_zero only takes list xs having even number of coefficients
    and largest non zero coefficient as it guarantees
    a solution.
    >>> round(find_zero([1, 2]), 2) # f(x) = 1 + 2x
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2) # (x - 1) * (x - 2) * (x - 3) = -6 + 11x - 6x^2 + x^3
    1.0
    """
    # Find initial bounds where polynomial changes sign
    low, high = -1000.0, 1000.0
    
    # Ensure we have opposite signs at bounds
    while poly(xs, low) * poly(xs, high) > 0:
        low *= 2
        high *= 2
    
    # Binary search (bisection method)
    tolerance = 1e-10
    while high - low > tolerance:
        mid = (low + high) / 2
        if poly(xs, mid) == 0:
            return mid
        if poly(xs, low) * poly(xs, mid) < 0:
            high = mid
        else:
            low = mid
    
    return (low + high) / 2