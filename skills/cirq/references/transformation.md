# Circuit Transformations

This guide covers circuit optimization, compilation, and manipulation using Cirq's transformation framework.

## Transformer Framework

### Basic Transformers

```python
import cirq

# Example circuit
qubits = cirq.LineQubit.range(3)
circuit = cirq.Circuit(
    cirq.H(qubits[0]),
    cirq.CNOT(qubits[0], qubits[1]),
    cirq.CNOT(qubits[1], qubits[2])
)

# Apply built-in transformer
from cirq.transformers import optimize_for_target_gateset

# Optimize to specific gate set
optimized = optimize_for_target_gateset(
    circuit,
    gateset=cirq.SqrtIswapTargetGateset()
)
```

### Merge Single-Qubit Gates

```python
from cirq.transformers import merge_single_qubit_gates_to_phxz

# Circuit with multiple single-qubit gates
circuit = cirq.Circuit(
    cirq.H(q),
    cirq.T(q),
    cirq.S(q),
    cirq.H(q)
)

# Merge into single operation
merged = merge_single_qubit_gates_to_phxz(circuit)
```

### Drop Negligible Operations

```python
from cirq.transformers import drop_negligible_operations

# Remove gates below threshold
circuit_with_small_rotations = cirq.Circuit(
    cirq.rz(1e-10)(q),  # Very small rotation
    cirq.H(q)
)

cleaned = drop_negligible_operations(circuit_with_small_rotations, atol=1e-8)
```

## Custom Transformers

### Transformer Decorator

```python
from cirq.transformers import transformer_api

@transformer_api.transformer
def remove_z_gates(circuit: cirq.Circuit, *, context=None) -> cirq.Circuit:
    """Remove all Z gates from circuit."""
    new_moments = []
    for moment in circuit:
        new_ops = [op for op in moment if not isinstance(op.gate, cirq.ZPowGate)]
        if new_ops:
            new_moments.append(cirq.Moment(new_ops))
    return cirq.Circuit(new_moments)

# Use custom transformer
transformed = remove_z_gates(circuit)
```

### Semantics-preserving replacements

Do not replace H by Ry(π/2) alone: their action differs. Use supported transformer
functions and compare the original and transformed unitaries up to global phase
on small measurement-free circuits. Removing all Z gates is deliberately a
semantics-changing filter, not an optimization.

## Gate Decomposition

### Decompose to Target Gateset

```python
from cirq.transformers import optimize_for_target_gateset

# Decompose to CZ + single-qubit rotations
target_gateset = cirq.CZTargetGateset()
decomposed = optimize_for_target_gateset(circuit, gateset=target_gateset)

# Decompose to √iSWAP gates
sqrt_iswap_gateset = cirq.SqrtIswapTargetGateset()
decomposed = optimize_for_target_gateset(circuit, gateset=sqrt_iswap_gateset)
```

### Custom Gate Decomposition

```python
class Toffoli(cirq.Gate):
    def _num_qubits_(self):
        return 3

    def _decompose_(self, qubits):
        """Decompose Toffoli into basic gates."""
        c1, c2, t = qubits
        return [
            cirq.H(t),
            cirq.CNOT(c2, t),
            cirq.T(t)**-1,
            cirq.CNOT(c1, t),
            cirq.T(t),
            cirq.CNOT(c2, t),
            cirq.T(t)**-1,
            cirq.CNOT(c1, t),
            cirq.T(c2),
            cirq.T(t),
            cirq.H(t),
            cirq.CNOT(c1, c2),
            cirq.T(c1),
            cirq.T(c2)**-1,
            cirq.CNOT(c1, c2)
        ]

# Use decomposition
circuit = cirq.Circuit(Toffoli()(q0, q1, q2))
decomposed = cirq.decompose(circuit)
```

## Circuit Optimization

### Eject Z Gates

```python
from cirq.transformers import eject_z

# Move Z gates to end of circuit
circuit = cirq.Circuit(
    cirq.H(q0),
    cirq.Z(q0),
    cirq.CNOT(q0, q1)
)

ejected = eject_z(circuit)
```

### Eject Phase Gates

```python
from cirq.transformers import eject_phased_paulis

# Consolidate phase gates
optimized = eject_phased_paulis(circuit, atol=1e-8)
```

### Drop Empty Moments

```python
from cirq.transformers import drop_empty_moments

# Remove moments with no operations
cleaned = drop_empty_moments(circuit)
```

### Measurement transformations

`dephase_measurements` replaces measurements with dephasing channels and loses
classical measurement records; it does not move them to the end. Use
`cirq.synchronize_terminal_measurements` only where terminal-measurement semantics
are suitable, and validate records as well as states.

## Circuit Compilation

### Compile for Hardware

```python
import cirq_google

# Get device specification
device = cirq_google.Sycamore

# Compile circuit to device
from cirq.transformers import optimize_for_target_gateset

compiled = optimize_for_target_gateset(
    circuit,
    gateset=cirq_google.SycamoreTargetGateset()
)

# Validate compiled circuit
device.validate_circuit(compiled)
```

### Compilation and routing

Use `cirq.optimize_for_target_gateset(circuit, gateset=cirq.CZTargetGateset())`
for CZ decomposition rather than a nonexistent `two_qubit_to_cz(op)` helper.
For topology routing, supply an actual NetworkX connectivity graph to
`cirq.RouteCQC(device_graph)` and use its documented call interface for the pinned
Cirq version. `NamedTopology` is not constructed from an adjacency dictionary.
Track the final logical-to-physical qubit mapping when comparing results; merely
inserting SWAPs without remapping later operations changes the computation.

## Advanced Transformations

### Unitary compilation

For a two-qubit 4×4 unitary use the supported
`cirq.two_qubit_matrix_to_cz_operations(q0, q1, unitary, allow_partial_czs=True)`.
KAK interaction coefficients cannot be copied directly into `XXPowGate` exponents:
sign, factor of two and global phase matter. Verify the resulting unitary.
A 2×2 matrix is a single-qubit unitary, not a KAK input.

### Circuit Simplification

```python
from cirq.transformers import (
    merge_k_qubit_unitaries,
    merge_single_qubit_gates_to_phxz
)

# Merge adjacent single-qubit gates
simplified = merge_single_qubit_gates_to_phxz(circuit)

# Merge adjacent k-qubit unitaries
simplified = merge_k_qubit_unitaries(circuit, k=2)
```

### Commutation-Based Optimization

```python
# Commute Z gates through CNOT
def commute_z_through_cnot(circuit):
    """Move Z gates through CNOT gates."""
    new_moments = []

    for moment in circuit:
        ops = list(moment)
        # Find Z gates before CNOT
        z_ops = [op for op in ops if isinstance(op.gate, cirq.ZPowGate)]
        cnot_ops = [op for op in ops if isinstance(op.gate, cirq.CXPowGate)]

        # Apply commutation rules
        # Z on control commutes; conjugating Z on target adds Z on control
        # (simplified logic here)

        new_moments.append(cirq.Moment(ops))

    return cirq.Circuit(new_moments)
```

## Transformation Pipelines

### Compose Multiple Transformers

```python
from cirq.transformers import transformer_api

# Build transformation pipeline
@transformer_api.transformer
def optimization_pipeline(circuit: cirq.Circuit, *, context=None) -> cirq.Circuit:
    # Step 1: Merge single-qubit gates
    circuit = merge_single_qubit_gates_to_phxz(circuit)

    # Step 2: Drop negligible operations
    circuit = drop_negligible_operations(circuit)

    # Step 3: Eject Z gates
    circuit = eject_z(circuit)

    # Step 4: Drop empty moments
    circuit = drop_empty_moments(circuit)

    return circuit

# Apply pipeline
optimized = optimization_pipeline(circuit)
```

## Validation and Analysis

### Circuit Depth Reduction

```python
# Measure circuit depth before and after
print(f"Original depth: {len(circuit)}")
optimized = optimization_pipeline(circuit)
print(f"Optimized depth: {len(optimized)}")
```

### Gate Count Analysis

```python
def count_gates(circuit):
    """Count gates by type."""
    counts = {}
    for moment in circuit:
        for op in moment:
            gate_type = type(op.gate).__name__
            counts[gate_type] = counts.get(gate_type, 0) + 1
    return counts

original_counts = count_gates(circuit)
optimized_counts = count_gates(optimized)
print(f"Original: {original_counts}")
print(f"Optimized: {optimized_counts}")
```

## Best Practices

1. **Start with high-level transformers**: Use built-in transformers before writing custom ones
2. **Chain transformers**: Apply multiple optimizations in sequence
3. **Validate after transformation**: Ensure circuit correctness and device compatibility
4. **Measure improvement**: Track depth and gate count reduction
5. **Use appropriate gatesets**: Match target hardware capabilities
6. **Consider commutativity**: Exploit gate commutation for optimization
7. **Test on small circuits first**: Verify transformers work correctly before scaling
