# HumanEval/99
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def closest_integer(value):
    '''
    Create a function that takes a value (string) representing a number
    and returns the closest integer to it. If the number is equidistant
    from two integers, round it away from zero.

    Examples
    >>> closest_integer("10")
    10
    >>> closest_integer("15.3")
    15

    Note:
    Rounding away from zero means that if the given number is equidistant
    from two integers, the one you should return is the one that is the
    farthest from zero. For example closest_integer("14.5") should
    return 15 and closest_integer("-14.5") should return -15.
    '''
    from math import floor, ceil
    
    num = float(value)
    
    # Check if the number is equidistant from two integers (ends in .5)
    if abs(num - round(num)) == 0.5 or (num != int(num) and abs(num % 1) == 0.5):
        # Round away from zero
        if num > 0:
            return ceil(num)
        else:
            return floor(num)
    else:
        return round(num)