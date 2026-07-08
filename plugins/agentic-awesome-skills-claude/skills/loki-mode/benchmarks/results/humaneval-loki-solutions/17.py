# HumanEval/17
# Loki Mode Multi-Agent Solution
# Attempts: 1
# Passed: True

from typing import List


def parse_music(music_string: str) -> List[int]:
    """ Input to this function is a string representing musical notes in a special ASCII format.
    Your task is to parse this string and return list of integers corresponding to how many beats does each
    not last.

    Here is a legend:
    'o' - whole note, lasts four beats
    'o|' - half note, lasts two beats
    '.|' - quater note, lasts one beat

    >>> parse_music('o o| .| o| o| .| .| .| .| o o')
    [4, 2, 1, 2, 2, 1, 1, 1, 1, 4, 4]
    """
    if not music_string:
        return []
    
    note_beats = {'o': 4, 'o|': 2, '.|': 1}
    tokens = music_string.split()
    return [note_beats[token] for token in tokens if token]