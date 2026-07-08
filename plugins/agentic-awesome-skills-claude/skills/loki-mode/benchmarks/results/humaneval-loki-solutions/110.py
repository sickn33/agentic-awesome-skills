# HumanEval/110
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def exchange(lst1, lst2):
    """In this problem, you will implement a function that takes two lists of numbers,
    and determines whether it is possible to perform an exchange of elements
    between them to make lst1 a list of only even numbers.
    There is no limit on the number of exchanged elements between lst1 and lst2.
    If it is possible to exchange elements between the lst1 and lst2 to make
    all the elements of lst1 to be even, return "YES".
    Otherwise, return "NO".
    For example:
    exchange([1, 2, 3, 4], [1, 2, 3, 4]) => "YES"
    exchange([1, 2, 3, 4], [1, 5, 3, 4]) => "NO"
    It is assumed that the input lists will be non-empty.
    """
    odds_in_lst1 = sum(1 for x in lst1 if x % 2 != 0)
    evens_in_lst2 = sum(1 for x in lst2 if x % 2 == 0)
    
    if evens_in_lst2 >= odds_in_lst1:
        return "YES"
    else:
        return "NO"