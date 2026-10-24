# Noise Modeling and Mitigation

This guide covers noise models, noisy simulation, characterization, and error mitigation in Cirq.

## Noise Channels

### Depolarizing Noise

```python
import cirq
import numpy as np

# Single-qubit depolarizing channel
depol_channel = cirq.depolarize(p=0.01)

# Apply to qubit
q = cirq.LineQubit(0)
noisy_op = depol_channel(q)

# Add to circuit
circuit = cirq.Circuit(
    cirq.H(q),
    depol_channel(q),
    cirq.measure(q, key='m')
)
```

### Amplitude Damping

```python
# Amplitude damping (T1 decay)
gamma = 0.1
amp_damp = cirq.amplitude_damp(gamma)

# Apply after gate
circuit = cirq.Circuit(
    cirq.X(q),
    amp_damp(q)
)
```

### Phase Damping

```python
# Phase damping (T2 dephasing)
gamma = 0.1
phase_damp = cirq.phase_damp(gamma)

circuit = cirq.Circuit(
    cirq.H(q),
    phase_damp(q)
)
```

### Bit Flip Noise

```python
# Bit flip channel
bit_flip_prob = 0.01
bit_flip = cirq.bit_flip(bit_flip_prob)

circuit = cirq.Circuit(
    cirq.H(q),
    bit_flip(q)
)
```

### Phase Flip Noise

```python
# Phase flip channel
phase_flip_prob = 0.01
phase_flip = cirq.phase_flip(phase_flip_prob)

circuit = cirq.Circuit(
    cirq.H(q),
    phase_flip(q)
)
```

### Generalized Amplitude Damping

```python
# Generalized amplitude damping
p = 0.1  # Environment ground-state population parameter
gamma = 0.2  # Damping strength
gen_amp_damp = cirq.generalized_amplitude_damp(p=p, gamma=gamma)
```

### Reset Channel

```python
# Reset to |0⟩ or |1⟩
reset_to_zero = cirq.reset(q)

# Reset appears as measurement followed by conditional flip
circuit = cirq.Circuit(
    cirq.H(q),
    reset_to_zero
)
```

## Noise Models

### Constant Noise Model

```python
# Apply same noise to all qubits
noise = cirq.ConstantQubitNoiseModel(
    qubit_noise_gate=cirq.depolarize(0.01)
)

# Simulate with noise
simulator = cirq.DensityMatrixSimulator(noise=noise)
result = simulator.run(circuit, repetitions=1000)
```

### Gate-Specific Noise

```python
class CustomNoiseModel(cirq.NoiseModel):
    """Apply different noise to different gate types."""

    def noisy_operation(self, op):
        if cirq.is_measurement(op):
            return op
        # Single-qubit gates: depolarizing noise
        if len(op.qubits) == 1:
            return [op, cirq.depolarize(0.001)(op.qubits[0])]

        # Two-qubit gates: higher depolarizing noise
        elif len(op.qubits) == 2:
            return [
                op,
                cirq.depolarize(0.01)(op.qubits[0]),
                cirq.depolarize(0.01)(op.qubits[1])
            ]

        return op

# Use custom noise model
noise_model = CustomNoiseModel()
simulator = cirq.DensityMatrixSimulator(noise=noise_model)
```

### Qubit-Specific Noise

```python
class QubitSpecificNoise(cirq.NoiseModel):
    """Different noise for different qubits."""

    def __init__(self, qubit_noise_map):
        self.qubit_noise_map = qubit_noise_map

    def noisy_operation(self, op):
        if cirq.is_measurement(op):
            return op
        noise_ops = [op]
        for qubit in op.qubits:
            if qubit in self.qubit_noise_map:
                noise = self.qubit_noise_map[qubit]
                noise_ops.append(noise(qubit))
        return noise_ops

# Define per-qubit noise
q0, q1, q2 = cirq.LineQubit.range(3)
noise_map = {
    q0: cirq.depolarize(0.001),
    q1: cirq.depolarize(0.005),
    q2: cirq.depolarize(0.002)
}

noise_model = QubitSpecificNoise(noise_map)
```

### Thermal Noise

```python
class ThermalNoise(cirq.NoiseModel):
    """Thermal relaxation noise."""

    def __init__(self, T1, T2, gate_time):
        self.T1 = T1  # Amplitude damping time
        self.T2 = T2  # Dephasing time
        self.gate_time = gate_time

    def noisy_operation(self, op):
        if cirq.is_measurement(op):
            return op
        # Calculate probabilities
        p_amp = 1 - np.exp(-self.gate_time / self.T1)
        if not (0 < self.T2 <= 2 * self.T1) or self.gate_time < 0:
            raise ValueError("Require positive T1/T2, T2 <= 2*T1 and nonnegative time")
        # Phase damping coherence is sqrt(1-gamma); avoid double counting T1.
        pure_dephasing_rate = 1 / self.T2 - 1 / (2 * self.T1)
        p_phase = 1 - np.exp(-2 * self.gate_time * pure_dephasing_rate)

        noise_ops = [op]
        for qubit in op.qubits:
            noise_ops.append(cirq.amplitude_damp(p_amp)(qubit))
            noise_ops.append(cirq.phase_damp(p_phase)(qubit))

        return noise_ops

# Typical superconducting qubit parameters
T1 = 50e-6  # 50 μs
T2 = 30e-6  # 30 μs
gate_time = 25e-9  # 25 ns

noise_model = ThermalNoise(T1, T2, gate_time)
```

## Adding Noise to Circuits

### with_noise Method

```python
# Add noise to all operations
noisy_circuit = circuit.with_noise(cirq.depolarize(p=0.01))

# Simulate noisy circuit
simulator = cirq.DensityMatrixSimulator()
result = simulator.run(noisy_circuit, repetitions=1000)
```

### Noise insertion

Use `circuit.with_noise(noise_model)`. A gate and its following noise overlap on
the same qubit and cannot be packed into one `cirq.Moment`. For custom models,
skip measurement operations unless intentionally modeling readout noise.

## Readout Noise

### Measurement Error Model

```python
class ReadoutNoiseModel(cirq.NoiseModel):
    """Model readout/measurement errors."""

    def __init__(self, p0_given_1, p1_given_0):
        # p0_given_1: Probability of measuring 0 when state is 1
        # p1_given_0: Probability of measuring 1 when state is 0
        self.p0_given_1 = p0_given_1
        self.p1_given_0 = p1_given_0

    def noisy_operation(self, op):
        if isinstance(op.gate, cirq.MeasurementGate):
            # Apply bit flip before measurement
            noise_ops = []
            for qubit in op.qubits:
                # Average readout error
                p_error = (self.p0_given_1 + self.p1_given_0) / 2
                noise_ops.append(cirq.bit_flip(p_error)(qubit))
            noise_ops.append(op)
            return noise_ops
        return op

# Typical readout errors
readout_noise = ReadoutNoiseModel(p0_given_1=0.02, p1_given_0=0.01)
```

## Noise Characterization

### Randomized Benchmarking

```python
import cirq

def generate_rb_circuit(qubits, depth):
    """Generate randomized benchmarking circuit."""
    # Random Clifford gates
    clifford_gates = [cirq.X, cirq.Y, cirq.Z, cirq.H, cirq.S]

    circuit = cirq.Circuit()
    for _ in range(depth):
        for qubit in qubits:
            gate = np.random.choice(clifford_gates)
            circuit.append(gate(qubit))

    # Invert the complete sampled sequence before measuring.
    circuit += cirq.Circuit(cirq.inverse(circuit))

    circuit.append(cirq.measure(*qubits, key='result'))
    return circuit

# Run RB experiment
def run_rb_experiment(qubits, depths, repetitions=1000):
    """Run randomized benchmarking at various depths."""
    simulator = cirq.DensityMatrixSimulator(
        noise=cirq.ConstantQubitNoiseModel(cirq.depolarize(0.01))
    )

    survival_probs = []
    for depth in depths:
        circuits = [generate_rb_circuit(qubits, depth) for _ in range(20)]

        total_survival = 0
        for circuit in circuits:
            result = simulator.run(circuit, repetitions=repetitions)
            # Calculate survival probability (returned to |0⟩)
            counts = result.histogram(key='result')
            survival = counts.get(0, 0) / repetitions
            total_survival += survival

        avg_survival = total_survival / len(circuits)
        survival_probs.append(avg_survival)

    return survival_probs

# Fit to extract error rate
# p_survival = A * p^depth + B
# Error per gate ≈ (1 - p) / 2
```

### Cross-Entropy Benchmarking (XEB)

```python
def xeb_fidelity(circuit, simulator, ideal_probs, repetitions=10000):
    """Calculate XEB fidelity."""

    # Run noisy simulation
    result = simulator.run(circuit, repetitions=repetitions)
    measured_probs = result.histogram(key='result')

    total = sum(measured_probs.values())
    if total <= 0:
        raise ValueError("No samples")
    n_qubits = len(circuit.all_qubits())
    # Linear XEB estimator, not logarithmic cross entropy.
    return 2**n_qubits * sum(count * ideal_probs.get(state, 0.0)
                            for state, count in measured_probs.items()) / total - 1
```

This estimator can fluctuate outside [0,1]. Interpreting it as circuit fidelity
requires the XEB experimental assumptions; random gate sampling above is only a
toy RB-like sequence, not a calibrated uniform Clifford benchmarking protocol.

## Noise Visualization

### Heatmap Visualization

```python
import matplotlib.pyplot as plt

def plot_noise_heatmap(device, noise_metric):
    """Plot noise characteristics across 2D grid device."""

    # Get device qubits (assuming GridQubit)
    qubits = sorted(device.metadata.qubit_set)
    rows = max(q.row for q in qubits) + 1
    cols = max(q.col for q in qubits) + 1

    # Create heatmap data
    heatmap = np.full((rows, cols), np.nan)

    for qubit in qubits:
        if isinstance(qubit, cirq.GridQubit):
            value = noise_metric.get(qubit, 0)
            heatmap[qubit.row, qubit.col] = value

    # Plot
    plt.figure(figsize=(10, 8))
    plt.imshow(heatmap, cmap='RdYlGn_r', interpolation='nearest')
    plt.colorbar(label='Error Rate')
    plt.title('Qubit Error Rates')
    plt.xlabel('Column')
    plt.ylabel('Row')
    plt.show()

# Example usage
noise_metric = {q: np.random.random() * 0.01 for q in device.metadata.qubit_set}
plot_noise_heatmap(device, noise_metric)
```

### Gate Fidelity Visualization

```python
def plot_gate_fidelities(calibration_data):
    """Plot single- and two-qubit gate fidelities."""

    sq_fidelities = []
    tq_fidelities = []

    for qubit, metrics in calibration_data.items():
        if 'single_qubit_rb_fidelity' in metrics:
            sq_fidelities.append(metrics['single_qubit_rb_fidelity'])
        if 'two_qubit_rb_fidelity' in metrics:
            tq_fidelities.append(metrics['two_qubit_rb_fidelity'])

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    ax1.hist(sq_fidelities, bins=20)
    ax1.set_xlabel('Single-Qubit Gate Fidelity')
    ax1.set_ylabel('Count')
    ax1.set_title('Single-Qubit Gate Fidelities')

    ax2.hist(tq_fidelities, bins=20)
    ax2.set_xlabel('Two-Qubit Gate Fidelity')
    ax2.set_ylabel('Count')
    ax2.set_title('Two-Qubit Gate Fidelities')

    plt.tight_layout()
    plt.show()
```

## Error Mitigation Techniques

### Zero-Noise Extrapolation

```python
def zero_noise_extrapolation(circuit, noise_levels, simulator):
    """Extrapolate to zero noise limit."""

    expectation_values = []

    for noise_level in noise_levels:
        # Scale noise
        noisy_circuit = circuit.with_noise(
            cirq.depolarize(p=noise_level)
        )

        # Measure expectation
        result = simulator.simulate(noisy_circuit)
        # ... calculate expectation value
        exp_val = calculate_expectation(result)
        expectation_values.append(exp_val)

    # Extrapolate to zero noise
    from scipy.optimize import curve_fit

    def exponential_fit(x, a, b, c):
        return a * np.exp(-b * x) + c

    popt, _ = curve_fit(exponential_fit, noise_levels, expectation_values)
    zero_noise_value = exponential_fit(0, *popt)

    return zero_noise_value
```

### Probabilistic Error Cancellation

```python
def quasi_probability_decomposition(noisy_gate, ideal_gate, noise_model):
    """Decompose noisy gate into quasi-probability distribution."""

    # Decompose noisy gate as: N = ideal + error
    # Invert: ideal = (N - error) / (1 - error_rate)

    # This creates a quasi-probability distribution
    # (some probabilities may be negative)

    # Implementation depends on specific noise model
    pass
```

### Readout Error Mitigation

```python
def mitigate_readout_errors(results, confusion_matrix):
    """Apply readout error mitigation using confusion matrix."""

    # Illustrative unconstrained correction, not a physical probability estimator.
    # Preserve signed quasiprobabilities and uncertainty; do not clip/round to counts.
    # Invert confusion matrix
    inv_confusion = np.linalg.inv(confusion_matrix)

    # Get measured counts
    counts = results.histogram(key='result')

    # Convert to probability vector
    total_counts = sum(counts.values())
    measured_probs = np.array([counts.get(i, 0) / total_counts
                               for i in range(len(confusion_matrix))])

    # Apply inverse
    corrected_probs = inv_confusion @ measured_probs

    # Convert back to counts
    corrected_counts = {i: float(p) * total_counts
                       for i, p in enumerate(corrected_probs)}

    return corrected_counts
```

## Hardware-based noise models

A device-specification protobuf is not a `GoogleNoiseProperties` object. Follow
the pinned `cirq-google` calibration conversion API, verify metric units and
calibration timestamp, and obtain account approval before remote reads. This
reference does not implement that conversion.

## Best Practices

1. **Use density matrix simulator for noisy simulations**: density matrices represent mixed states directly; state-vector noise uses sampled trajectories
2. **Match noise model to hardware**: Use calibration data when available
3. **Include all error sources**: Gate errors, decoherence, readout errors
4. **Characterize before mitigating**: Understand noise before applying mitigation
5. **Consider error propagation**: Noise compounds through circuit depth
6. **Use appropriate benchmarking**: RB for gate errors, XEB for full circuit fidelity
7. **Visualize noise patterns**: Identify problematic qubits and gates
8. **Apply targeted mitigation**: Focus on dominant error sources
9. **Validate mitigation**: Verify that mitigation improves results
10. **Keep circuits shallow**: Minimize noise accumulation
