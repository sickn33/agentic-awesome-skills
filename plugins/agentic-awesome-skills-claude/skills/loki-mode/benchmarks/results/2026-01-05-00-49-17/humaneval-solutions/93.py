def encode(message):
    """
    Write a function that takes a message, and encodes in such a 
    way that it swaps case of all letters, replaces all vowels in 
    the message with the letter that appears 2 places ahead of that 
    vowel in the english alphabet. 
    Assume only letters. 
    
    Examples:
    >>> encode('test')
    'TGST'
    >>> encode('This is a message')
    'tHKS KS C MGSSCGG'
    """
    vowels = 'aeiouAEIOU'
    result = []
    
    for char in message:
        if char.isalpha():
            # Swap case
            if char.isupper():
                new_char = char.lower()
            else:
                new_char = char.upper()
            
            # If it's a vowel (after case swap), replace with letter 2 places ahead
            if new_char in vowels:
                new_char = chr(ord(new_char) + 2)
            
            result.append(new_char)
        else:
            result.append(char)
    
    return ''.join(result)