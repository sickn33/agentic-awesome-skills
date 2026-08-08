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
    take_min = True
    
    while sorted_lst:
        if take_min:
            result.append(sorted_lst.pop(0))
        else:
            result.append(sorted_lst.pop())
        take_min = not take_min
    
    return result