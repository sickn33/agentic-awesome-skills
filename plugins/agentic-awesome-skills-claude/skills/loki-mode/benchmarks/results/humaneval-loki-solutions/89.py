# HumanEval/89
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def encrypt(s):
    """Create a function encrypt that takes a string as an argument and
    returns a string encrypted with the alphabet being rotated. 
    The alphabet should be rotated in a manner such that the letters 
    shift down by two multiplied to two places.
    For example:
    encrypt('hi') returns 'lm'
    encrypt('asdfghjkl') returns 'ewhjklnop'
    encrypt('gf') returns 'kj'
    encrypt('et') returns 'ix'
    """
    result = []
    for c in s:
        if c.islower():
            result.append(chr((ord(c) - ord('a') + 4) % 26 + ord('a')))
        elif c.isupper():
            result.append(chr((ord(c) - ord('A') + 4) % 26 + ord('A')))
        else:
            result.append(c)
    return ''.join(result)