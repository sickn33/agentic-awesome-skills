# HumanEval/157
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def right_angle_triangle(a, b, c):
    '''
    Given the lengths of the three sides of a triangle. Return True if the three
    sides form a right-angled triangle, False otherwise.
    A right-angled triangle is a triangle in which one angle is right angle or 
    90 degree.
    Example:
    right_angle_triangle(3, 4, 5) == True
    right_angle_triangle(1, 2, 3) == False
    '''
    epsilon = 1e-9
    a_sq = a * a
    b_sq = b * b
    c_sq = c * c
    
    if abs(a_sq + b_sq - c_sq) < epsilon:
        return True
    if abs(a_sq + c_sq - b_sq) < epsilon:
        return True
    if abs(b_sq + c_sq - a_sq) < epsilon:
        return True
    
    return False