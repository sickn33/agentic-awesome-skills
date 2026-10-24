# Sequence Alignments with Bio.Align and Bio.AlignIO

> Adapted reference, not a standalone script. Validate inputs, preserve originals, pin software/tool versions, and authorize any remote sequence/query submission. Examples require the shown external files and application-specific setup; absence of errors is not biological validation.


## Overview

Bio.Align provides tools for pairwise sequence alignment using various algorithms, while Bio.AlignIO handles reading and writing multiple sequence alignment files in various formats.

## Pairwise Alignment with Bio.Align

### The PairwiseAligner Class

The `PairwiseAligner` class performs pairwise sequence alignments using Needleman-Wunsch (global), Smith-Waterman (local), Gotoh (three-state), and Waterman-Smith-Beyer algorithms. The appropriate algorithm is automatically selected based on gap score parameters.

### Creating an Aligner

```python
from Bio import Align

# Create aligner with default parameters
aligner = Align.PairwiseAligner()

# Default scores (as of Biopython 1.86+):
# - Match score: +1.0
# - Mismatch score: 0.0
# - All gap scores: -1.0  (changed from 0 in 1.86 to avoid trivial tie alignments)
```

**Note (1.86+):** The default gap score changed from 0 to -1. Previously, mismatches and gap combinations could score 0, producing many logically equivalent alignments. To restore pre-1.86 behavior:

```python
aligner.gap_score = 0
```

### Customizing Alignment Parameters

```python
# Set scoring parameters
aligner.match_score = 2.0
aligner.mismatch_score = -1.0
aligner.gap_score = -0.5

# Or use separate gap opening/extension penalties
aligner.open_gap_score = -2.0
aligner.extend_gap_score = -0.5

# Set internal gap scores separately
aligner.internal_open_gap_score = -2.0
aligner.internal_extend_gap_score = -0.5

# Set end gap scores (for semi-global alignment)
aligner.left_open_gap_score = 0.0
aligner.left_extend_gap_score = 0.0
aligner.right_open_gap_score = 0.0
aligner.right_extend_gap_score = 0.0
```

### Alignment Modes

```python
# Global alignment (default)
aligner.mode = 'global'

# Local alignment
aligner.mode = 'local'
```

### Performing Alignments

```python
from Bio.Seq import Seq

seq1 = Seq("ACCGGT")
seq2 = Seq("ACGGT")

# Get all optimal alignments
alignments = aligner.align(seq1, seq2)

# Iterate through alignments
for alignment in alignments:
    print(alignment)
    print(f"Score: {alignment.score}")

# Get just the score
score = aligner.score(seq1, seq2)
```

### Using Substitution Matrices

```python
from Bio.Align import substitution_matrices

# Load a substitution matrix
matrix = substitution_matrices.load("BLOSUM62")
aligner.substitution_matrix = matrix

# Align protein sequences
protein1 = Seq("KEVLA")
protein2 = Seq("KSVLA")
alignments = aligner.align(protein1, protein2)
```

### Available Substitution Matrices

Common matrices include:
- **BLOSUM** series (BLOSUM45, BLOSUM50, BLOSUM62, BLOSUM80, BLOSUM90)
- **PAM** series (PAM30, PAM70, PAM250)
- **MATCH** - Simple match/mismatch matrix

```python
# List available matrices
available = substitution_matrices.load()
print(available)
```

## Multiple Sequence Alignments with Bio.AlignIO

### Reading Alignments

Bio.AlignIO provides similar API to Bio.SeqIO but for alignment files:

```python
from Bio import AlignIO

# Read a single alignment
alignment = AlignIO.read("alignment.aln", "clustal")

# Parse multiple alignments from a file
for alignment in AlignIO.parse("alignments.aln", "clustal"):
    print(f"Alignment with {len(alignment)} sequences")
    print(f"Alignment length: {alignment.get_alignment_length()}")
```

### Supported Alignment Formats

Common formats include:
- **clustal** - Clustal format
- **phylip** - PHYLIP format
- **phylip-relaxed** - Relaxed PHYLIP (longer names)
- **stockholm** - Stockholm format
- **fasta** - FASTA format (aligned)
- **nexus** - NEXUS format
- **emboss** - EMBOSS alignment format
- **msf** - MSF format
- **maf** - Multiple Alignment Format

### Writing Alignments

```python
# Write alignment to file
AlignIO.write(alignment, "output.aln", "clustal")

# Convert between formats
count = AlignIO.convert("input.aln", "clustal", "output.phy", "phylip")
```

### Working with Alignment Objects

```python
from Bio import AlignIO

alignment = AlignIO.read("alignment.aln", "clustal")

# Get alignment properties
print(f"Number of sequences: {len(alignment)}")
print(f"Alignment length: {alignment.get_alignment_length()}")

# Access individual sequences
for record in alignment:
    print(f"{record.id}: {record.seq}")

# Get alignment column
column = alignment[:, 0]  # First column

# Get alignment slice
sub_alignment = alignment[:, 10:20]  # Positions 10-20

# Get specific sequence
seq_record = alignment[0]  # First sequence
```

### Alignment Analysis

```python
from collections import Counter
from Bio import motifs
# DNA alignment: explicitly exclude gaps and ambiguous bases from this consensus.
columns = [Counter(base for base in alignment[:, i] if base in "ACGT")
           for i in range(alignment.get_alignment_length())]
consensus = "".join(max(c, key=c.get) if c else "N" for c in columns)
# For a motif, use an ungapped aligned DNA subset and specify background/pseudocounts.
ungapped = [i for i in range(alignment.get_alignment_length())
            if all(record.seq[i] in "ACGT" for record in alignment)]
from Bio.Seq import Seq
motif = motifs.create([Seq("".join(record.seq[i] for i in ungapped))
                       for record in alignment])
information = sum(motif.relative_entropy)

```

## Creating Alignments Programmatically

### From SeqRecord Objects

```python
from Bio.Align import MultipleSeqAlignment
from Bio.SeqRecord import SeqRecord
from Bio.Seq import Seq

# Create records
records = [
    SeqRecord(Seq("ACTGCTAGCTAG"), id="seq1"),
    SeqRecord(Seq("ACT-CTAGCTAG"), id="seq2"),
    SeqRecord(Seq("ACTGCTA-CTAG"), id="seq3"),
]

# Create alignment
alignment = MultipleSeqAlignment(records)
```

### Adding Sequences to Alignments

```python
# Start with empty alignment
alignment = MultipleSeqAlignment([])

# Add sequences (must have same length)
alignment.append(SeqRecord(Seq("ACTG"), id="seq1"))
alignment.append(SeqRecord(Seq("ACTG"), id="seq2"))

# Extend with another alignment
alignment.extend(other_alignment)
```

## Advanced Alignment Operations

### Removing Gaps

```python
# Remove all gap-only columns
from Bio.Align import AlignInfo

no_gaps = []
for i in range(alignment.get_alignment_length()):
    column = alignment[:, i]
    if set(column) != {'-'}:  # Not all gaps
        no_gaps.append(column)
```

### Alignment Sorting

```python
# Sort by sequence ID
sorted_alignment = sorted(alignment, key=lambda x: x.id)
alignment = MultipleSeqAlignment(sorted_alignment)
```

### Computing Pairwise Identities

```python
def pairwise_identity(seq1, seq2):
    """Calculate percent identity between two sequences."""
    if len(seq1) != len(seq2):
        raise ValueError("Aligned sequences must have equal lengths")
    matches = sum(a == b for a, b in zip(seq1, seq2) if a != '-' and b != '-')
    length = sum(1 for a, b in zip(seq1, seq2) if a != '-' and b != '-')
    return matches / length if length > 0 else 0

# Calculate all pairwise identities
for i, record1 in enumerate(alignment):
    for record2 in alignment[i+1:]:
        identity = pairwise_identity(record1.seq, record2.seq)
        print(f"{record1.id} vs {record2.id}: {identity:.2%}")
```

## Running External Alignment Tools

### Clustal Omega (via Command Line)

```python
import subprocess
# Install and select trusted external binaries separately. Explicit argv avoids shell parsing.
subprocess.run(["clustalo", "-i", "sequences.fasta", "-o", "alignment.aln",
                "--outfmt=clu"], check=True)
alignment = AlignIO.read("alignment.aln", "clustal")
```

### MUSCLE (version 5 command line)

```python
import subprocess
# Confirm installed MUSCLE major version; v3 used different flags.
subprocess.run(["muscle", "-align", "sequences.fasta", "-output", "alignment.fasta"], check=True)
```

Biopython’s old Bio.Align.Applications wrappers are unavailable in current releases.
Use the installed executable’s documented arguments and record its version.

## Best Practices

1. **Choose appropriate scoring schemes** - Use BLOSUM62 for proteins, custom scores for DNA
2. **Consider alignment mode** - Global for similar-length sequences, local for finding conserved regions
3. **Set gap penalties carefully** - Higher penalties create fewer, longer gaps
4. **Use appropriate formats** - FASTA for simple alignments, Stockholm for rich annotation
5. **Validate alignment quality** - Check for conserved regions and percent identity
6. **Handle large alignments carefully** - Use slicing and iteration for memory efficiency
7. **Preserve metadata** - Maintain SeqRecord IDs and annotations through alignment operations

## Common Use Cases

### Find Best Local Alignment

```python
from Bio.Align import PairwiseAligner
from Bio.Seq import Seq

aligner = PairwiseAligner()
aligner.mode = 'local'
aligner.match_score = 2
aligner.mismatch_score = -1

seq1 = Seq("AGCTTAGCTAGCTAGC")
seq2 = Seq("CTAGCTAGC")

alignments = aligner.align(seq1, seq2)
print(alignments[0])
```

### Protein Sequence Alignment

```python
from Bio.Align import PairwiseAligner, substitution_matrices

aligner = PairwiseAligner()
aligner.substitution_matrix = substitution_matrices.load("BLOSUM62")
aligner.open_gap_score = -10
aligner.extend_gap_score = -0.5

protein1 = Seq("KEVLA")
protein2 = Seq("KEVLAEQP")
alignments = aligner.align(protein1, protein2)
```

### Extract Conserved Regions

```python
from Bio import AlignIO

alignment = AlignIO.read("alignment.aln", "clustal")

# Find columns with >80% identity
conserved_positions = []
for i in range(alignment.get_alignment_length()):
    column = alignment[:, i]
    most_common = max(set(column), key=column.count)
    if column.count(most_common) / len(column) > 0.8:
        conserved_positions.append(i)

print(f"Conserved positions: {conserved_positions}")
```
