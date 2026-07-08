# HumanEval/151
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def double_the_difference(lst):
    '''
    Given a list of numbers, return the sum of squares of the numbers
    in the list that are odd. Ignore numbers that are negative or not integers.
    
    double_the_difference([1, 3, 2, 0]) == 1 + 9 + 0 + 0 = 10
    double_the_difference([-1, -2, 0]) == 0
    double_the_difference([9, -2]) == 81
    double_the_difference([0]) == 0  
   
    If the input list is empty, return 0.
    '''
    total = 0
    for n in lst:
        if isinstance(n, int) and not isinstance(n, bool) and n > 0 and n % 2 != 0:
            total += n * n
    return total