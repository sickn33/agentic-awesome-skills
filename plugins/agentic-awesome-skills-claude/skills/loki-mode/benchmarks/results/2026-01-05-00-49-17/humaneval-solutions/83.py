def starts_one_ends(n):
    """
    Given a positive integer n, return the count of the numbers of n-digit
    positive integers that start or end with 1.
    """
    if n == 1:
        return 1
    
    # For n-digit numbers:
    # Numbers starting with 1: 1 * 10^(n-1) choices (1 followed by any n-1 digits)
    # Numbers ending with 1: 9 * 10^(n-2) * 1 choices (first digit 1-9, middle n-2 digits 0-9, last digit 1)
    # Numbers starting AND ending with 1: 1 * 10^(n-2) * 1 choices (overlap to subtract)
    
    # Using inclusion-exclusion:
    # |A or B| = |A| + |B| - |A and B|
    
    starts_with_1 = 10 ** (n - 1)  # 1 followed by any (n-1) digits
    ends_with_1 = 9 * (10 ** (n - 2))  # first digit 1-9, middle (n-2) any, last digit 1
    both = 10 ** (n - 2)  # starts with 1 and ends with 1
    
    return starts_with_1 + ends_with_1 - both