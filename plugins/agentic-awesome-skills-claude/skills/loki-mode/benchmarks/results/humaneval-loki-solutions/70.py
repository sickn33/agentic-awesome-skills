# HumanEval/70
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def strange_sort_list(lst):
    '''
    Given list of integers, return list in strange order.
    Strange sorting, is when you start with the minimum value,
    then maximum of the remaining integers, then minimum and so on.

    Examples:
    strange_sort_list([1, 2, 3, 4]) == [1, 4, 2, 3]
    strange_sort_list([5, 5, 5, 5]) == [5, 5, 5, 5]
    strange_sort_list([]) == []
    '''
    if not lst:
        return []
    
    sorted_lst = sorted(lst)
    result = []
    left = 0
    right = len(sorted_lst) - 1
    pick_min = True
    
    while left <= right:
        if pick_min:
            result.append(sorted_lst[left])
            left += 1
        else:
            result.append(sorted_lst[right])
            right -= 1
        pick_min = not pick_min
    
    return result