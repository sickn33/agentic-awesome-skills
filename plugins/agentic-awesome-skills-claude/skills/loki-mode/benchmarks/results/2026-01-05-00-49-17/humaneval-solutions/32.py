import math


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[1] * x^2 + .... xs[n] * x^n
    """
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


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
    # Use Newton-Raphson method to find a zero
    # First, find a suitable starting point and bounds
    
    # For a polynomial with odd degree (even number of coefficients),
    # there's guaranteed to be at least one real root
    
    # Use bisection method to find bounds, then Newton-Raphson
    
    # Find bounds where the polynomial changes sign
    lo, hi = -1.0, 1.0
    
    # Expand bounds until we find a sign change
    while poly(xs, lo) * poly(xs, hi) > 0:
        lo *= 2
        hi *= 2
    
    # Bisection method for reliability
    while hi - lo > 1e-10:
        mid = (lo + hi) / 2.0
        if poly(xs, mid) == 0:
            return mid
        if poly(xs, lo) * poly(xs, mid) < 0:
            hi = mid
        else:
            lo = mid
    
    return (lo + hi) / 2.0