# HumanEval/92
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def any_int(x, y, z):
    '''
    Create a function that takes 3 numbers.
    Returns true if one of the numbers is equal to the sum of the other two, and all numbers are integers.
    Returns false in any other cases.
    
    Examples
    any_int(5, 2, 7) ➞ True
    
    any_int(3, 2, 2) ➞ False

    any_int(3, -2, 1) ➞ True
    
    any_int(3.6, -2.2, 2) ➞ False
  

    
    '''
    # Check all three are integers but not bools
    if not all(isinstance(n, int) and not isinstance(n, bool) for n in [x, y, z]):
        return False
    
    # Check if any one equals the sum of the other two
    return x == y + z or y == x + z or z == x + y