def order_by_points(nums):
    """
    Write a function which sorts the given list of integers
    in ascending order according to the sum of their digits.
    Note: if there are several items with similar sum of their digits,
    order them based on their index in original list.

    For example:
    >>> order_by_points([1, 11, -1, -11, -12]) == [-1, -11, 1, -12, 11]
    >>> order_by_points([]) == []
    """
    def digit_sum(n):
        s = str(abs(n))
        total = 0
        for i, digit in enumerate(s):
            if i == 0 and n < 0:
                total -= int(digit)
            else:
                total += int(digit)
        return total
    
    return sorted(nums, key=digit_sum)