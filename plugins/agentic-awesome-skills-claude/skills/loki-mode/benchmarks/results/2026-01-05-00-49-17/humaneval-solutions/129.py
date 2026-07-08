def minPath(grid, k):
    """
    Given a grid with N rows and N columns (N >= 2) and a positive integer k, 
    each cell of the grid contains a value. Every integer in the range [1, N * N]
    inclusive appears exactly once on the cells of the grid.

    You have to find the minimum path of length k in the grid. You can start
    from any cell, and in each step you can move to any of the neighbor cells,
    in other words, you can go to cells which share an edge with you current
    cell.
    Please note that a path of length k means visiting exactly k cells (not
    necessarily distinct).
    You CANNOT go off the grid.
    A path A (of length k) is considered less than a path B (of length k) if
    after making the ordered lists of the values on the cells that A and B go
    through (let's call them lst_A and lst_B), lst_A is lexicographically less
    than lst_B, in other words, there exist an integer index i (1 <= i <= k)
    such that lst_A[i] < lst_B[i] and for any j (1 <= j < i) we have
    lst_A[j] = lst_B[j].
    It is guaranteed that the answer is unique.
    Return an ordered list of the values on the cells that the minimum path go through.

    Examples:

        Input: grid = [ [1,2,3], [4,5,6], [7,8,9]], k = 3
        Output: [1, 2, 1]

        Input: grid = [ [5,9,3], [4,1,6], [7,8,2]], k = 1
        Output: [1]
    """
    n = len(grid)
    
    # Find position of value 1 (the minimum value)
    pos_1 = None
    for i in range(n):
        for j in range(n):
            if grid[i][j] == 1:
                pos_1 = (i, j)
                break
        if pos_1:
            break
    
    # Find the minimum neighbor of cell containing 1
    i, j = pos_1
    min_neighbor = float('inf')
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    for di, dj in directions:
        ni, nj = i + di, j + dj
        if 0 <= ni < n and 0 <= nj < n:
            min_neighbor = min(min_neighbor, grid[ni][nj])
    
    # The minimum path starting from 1 will alternate between 1 and its minimum neighbor
    # This is because we can always go back to 1 from any neighbor
    result = []
    for step in range(k):
        if step % 2 == 0:
            result.append(1)
        else:
            result.append(min_neighbor)
    
    return result