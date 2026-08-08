# HumanEval/118
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

def get_closest_vowel(word):
    """You are given a word. Your task is to find the closest vowel that stands between 
    two consonants from the right side of the word (case sensitive).
    
    Vowels in the beginning and ending doesn't count. Return empty string if you didn't
    find any vowel met the above condition. 

    You may assume that the given string contains English letter only.

    Example:
    get_closest_vowel("yogurt") ==> "u"
    get_closest_vowel("FULL") ==> "U"
    get_closest_vowel("quick") ==> ""
    get_closest_vowel("ab") ==> ""
    """
    if len(word) < 3:
        return ""
    
    vowels = set("aeiouAEIOU")
    
    for i in range(len(word) - 2, 0, -1):
        if word[i] in vowels:
            if word[i - 1] not in vowels and word[i + 1] not in vowels:
                return word[i]
    
    return ""