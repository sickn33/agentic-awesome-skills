# HumanEval/71
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def triangle_area(a, b, c):
    '''
    Given the lengths of the three sides of a triangle. Return the area of
    the triangle rounded to 2 decimal points if the three sides form a valid triangle. 
    Otherwise return -1
    Three sides make a valid triangle when the sum of any two sides is greater 
    than the third side.
    Example:
    triangle_area(3, 4, 5) == 6.00
    triangle_area(1, 2, 10) == -1
    '''
    # Check for zero or negative side lengths
    if a <= 0 or b <= 0 or c <= 0:
        return -1
    
    # Check triangle inequality (sum of any two sides must be greater than the third)
    if a + b <= c or a + c <= b or b + c <= a:
        return -1
    
    # Calculate area using Heron's formula
    s = (a + b + c) / 2
    area = (s * (s - a) * (s - b) * (s - c)) ** 0.5
    
    return round(area, 2)