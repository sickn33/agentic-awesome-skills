# HumanEval/162
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def string_to_md5(text):
    """
    Given a string 'text', return its md5 hash equivalent string.
    If 'text' is an empty string, return None.

    >>> string_to_md5('Hello world') == '3e25960a79dbc69b674cd4ec67a72c62'
    """
    if text == '':
        return None
    import hashlib
    return hashlib.new("md5", text.encode(), usedforsecurity=False).hexdigest()