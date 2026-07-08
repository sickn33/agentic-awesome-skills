def correct_bracketing(brackets: str):
    """ brackets is a string of "<" and ">".
    return True if every opening bracket has a corresponding closing bracket.

    >>> correct_bracketing("<")
    False
    >>> correct_bracketing("<>")
    True
    >>> correct_bracketing("<<><>>")
    True
    >>> correct_bracketing("><<>")
    False
    """
    depth = 0
    for bracket in brackets:
        if bracket == "<":
            depth += 1
        elif bracket == ">":
            depth -= 1
        if depth < 0:
            return False
    return depth == 0