# HumanEval/154
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def cycpattern_check(a , b):
    """You are given 2 words. You need to return True if the second word or any of its rotations is a substring in the first word
    cycpattern_check("abcd","abd") => False
    cycpattern_check("hello","ell") => True
    cycpattern_check("whassup","psus") => False
    cycpattern_check("abab","baa") => True
    cycpattern_check("efef","eeff") => False
    cycpattern_check("himenss","simen") => True

    """
    if len(b) == 0:
        return True
    if len(b) > len(a):
        return False
    
    for i in range(len(b)):
        rotation = b[i:] + b[:i]
        if rotation in a:
            return True
    return False