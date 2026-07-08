from typing import List


def separate_paren_groups(paren_string: str) -> List[str]:
    """ Input to this function is a string containing multiple groups of nested parentheses. Your goal is to
    separate those group into separate strings and return the list of those.
    Separate groups are balanced (each open brace is properly closed) and not nested within each other
    Ignore any spaces in the input string.
    >>> separate_paren_groups('( ) (( )) (( )( ))')
    ['()', '(())', '(()())']
    """
    paren_string = paren_string.replace(' ', '')
    result = []
    current_group = ''
    depth = 0
    
    for char in paren_string:
        if char == '(':
            depth += 1
            current_group += char
        elif char == ')':
            depth -= 1
            current_group += char
            if depth == 0:
                result.append(current_group)
                current_group = ''
    
    return result