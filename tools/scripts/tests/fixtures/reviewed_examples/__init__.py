from pathlib import Path
from .sources import SOURCES
from .security_sources import SOURCES as SECURITY_SOURCES
SOURCES = {**SOURCES, **SECURITY_SOURCES}
ROOT = Path(__file__).resolve().parents[5]
def reviewed_source(relative):
    source_path = ROOT / relative
    actual = source_path.read_text()
    detail = source_path.parent / 'references/detailed-guide.md'
    if source_path.name == 'SKILL.md' and detail.is_file():
        actual += '\n' + detail.read_text()
    expected = SOURCES[relative]
    if actual != expected:
        raise AssertionError('Example changed: review and update trusted fixture before execution: ' + relative)
    return expected
