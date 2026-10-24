# Hardware Backends and Execution

Qiskit is backend-agnostic and supports execution on simulators and real quantum hardware from multiple providers.

## Backend Types

### Local Simulators
- Run on your machine
- No account required
- Perfect for development and testing

### Cloud-Based Hardware
- IBM Quantum (100+ qubit systems)
- IonQ (trapped ion)
- Amazon Braket (Rigetti, IonQ, Oxford Quantum Circuits)
- Other providers via plugins

## IBM Quantum Backends

### Connecting to IBM Quantum

```python
from qiskit_ibm_runtime import QiskitRuntimeService
from getpass import getpass

# First time: save credentials
QiskitRuntimeService.save_account(
    token=getpass("IBM Cloud API key: ")
)

# Subsequent sessions: load credentials
service = QiskitRuntimeService()
```

### Listing Available Backends

```python
# List all available backends
backends = service.backends()
for backend in backends:
    print(f"{backend.name}: {backend.num_qubits} qubits")

# Filter by minimum qubits
backends_127q = service.backends(min_num_qubits=127)

# Get specific backend
backend = service.least_busy(operational=True, simulator=False)
backend = service.least_busy()  # Get least busy backend
```

### Backend Properties

```python
backend = service.least_busy(operational=True, simulator=False)

# Basic info
print(f"Name: {backend.name}")
print(f"Qubits: {backend.num_qubits}")
print(f"Version: {backend.version}")
print(f"Status: {backend.status()}")

# Coupling map (qubit connectivity)
print(backend.coupling_map)

# Basis gates
print(backend.operation_names)

# Qubit properties
print(backend.qubit_properties(0))  # Properties of qubit 0
```

### Checking Backend Status

```python
status = backend.status()
print(f"Operational: {status.operational}")
print(f"Pending jobs: {status.pending_jobs}")
print(f"Status message: {status.status_msg}")
```

## Running on IBM Quantum Hardware

### Using Runtime Primitives

```python
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler

service = QiskitRuntimeService()
backend = service.least_busy(operational=True, simulator=False)

# Create and transpile circuit
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()

# Transpile for backend
transpiled_qc = transpile(qc, backend=backend, optimization_level=3)

# Run with Sampler
sampler = Sampler(mode=backend)
job = sampler.run([transpiled_qc], shots=1024)

# Retrieve results
result = job.result()
counts = result[0].data.meas.get_counts()
print(counts)
```

### Job Management

```python
# Submit job
job = sampler.run([qc], shots=1024)

# Get job ID (save for later retrieval)
job_id = job.job_id()
print(f"Job ID: {job_id}")

# Check job status
print(job.status())

# Wait for completion
result = job.result()

# Retrieve job later
service = QiskitRuntimeService()
retrieved_job = service.job(job_id)
result = retrieved_job.result()
```

### Job Queuing

```python
# Check queue position
job_status = job.status()
print(f"Status: {job_status}")  # queue position is not a portable Runtime V2 method

# Cancel job if needed
job.cancel()
```

## Session Mode

Use sessions for iterative algorithms (VQE, QAOA) to reduce queue time:

```python
from qiskit_ibm_runtime import Session, SamplerV2 as Sampler

service = QiskitRuntimeService()
backend = service.least_busy(operational=True, simulator=False)

with Session(backend=backend) as session:
    sampler = Sampler(mode=session)

    # Multiple iterations in same session
    for iteration in range(10):
        # Parameterized circuit
        qc = create_parameterized_circuit(params[iteration])
        job = sampler.run([qc], shots=1024)
        result = job.result()

        # Update parameters based on results
        params[iteration + 1] = optimize(result)
```

Session benefits:
- Reduced queue waiting between iterations
- Session prioritization depends on availability, limits and account entitlement
- Better for variational algorithms

## Batch Mode

Use batch mode for independent parallel jobs:

```python
from qiskit_ibm_runtime import Batch, SamplerV2 as Sampler

service = QiskitRuntimeService()
backend = service.least_busy(operational=True, simulator=False)

with Batch(backend=backend) as batch:
    sampler = Sampler(mode=batch)

    # Submit multiple independent jobs
    jobs = []
    for qc in circuit_list:
        job = sampler.run([qc], shots=1024)
        jobs.append(job)

    # Collect all results
    results = [job.result() for job in jobs]
```

## Local Simulators

### StatevectorSampler (Ideal Simulation)

```python
from qiskit.primitives import StatevectorSampler

sampler = StatevectorSampler()
result = sampler.run([qc], shots=1024).result()
counts = result[0].data.meas.get_counts()
```

### Aer Simulator (Realistic Noise)

```python
from qiskit_aer import AerSimulator
from qiskit_ibm_runtime import SamplerV2 as Sampler

# Ideal simulation
simulator = AerSimulator()

# Simulate with backend noise model
backend = service.least_busy(operational=True, simulator=False)
noisy_simulator = AerSimulator.from_backend(backend)

# Run simulation
transpiled_qc = transpile(qc, simulator)
sampler = Sampler(mode=simulator)
job = sampler.run([transpiled_qc], shots=1024)
result = job.result()
```

### Aer GPU Acceleration

```python
# Use GPU for faster simulation
simulator = AerSimulator(method='statevector', device='GPU')
```

## Third-Party Providers

### IonQ

IonQ offers trapped-ion quantum computers with all-to-all connectivity:

```python
from qiskit_ionq import IonQProvider

provider = IonQProvider("YOUR_IONQ_API_TOKEN")

# List IonQ backends
backends = provider.backends()
backend = provider.get_backend("ionq_qpu")

# Run circuit
job = backend.run(qc, shots=1024)
result = job.result()
```

### Amazon Braket

```python
from qiskit_braket_provider import BraketProvider

provider = BraketProvider()

# List available devices
backends = provider.backends()

# Use specific device
backend = provider.get_backend("Rigetti")
job = backend.run(qc, shots=1024)
result = job.result()
```

## Error Mitigation

Runtime V2 Sampler and Estimator have different option schemas. Do not reuse
legacy `Options`/`resilience_level` examples across them. Select mitigation only
after checking the installed primitive's options and budget; mitigation can add
substantial execution cost. Test locally before hardware.

## Monitoring Usage and Costs

### Check Account Usage

```python
# For IBM Quantum
service = QiskitRuntimeService()

# Check remaining credits
print(job.usage())  # completed workload usage; inspect account/instance limits separately
```

### Estimate Job Cost

```python
from qiskit_ibm_runtime import EstimatorV2 as Estimator

backend = service.least_busy(operational=True, simulator=False)

# Estimate job cost
estimator = Estimator(mode=backend)
# Cost depends on circuit complexity and shots
```

## Best Practices

### 1. Always Transpile Before Running

```python
# Bad: Run without transpilation
job = sampler.run([qc], shots=1024)

# Good: Transpile first
qc_transpiled = transpile(qc, backend=backend, optimization_level=3)
job = sampler.run([qc_transpiled], shots=1024)
```

### 2. Test with Simulators First

```python
# Test with noisy simulator before hardware
noisy_sim = AerSimulator.from_backend(backend)
qc_test = transpile(qc, noisy_sim, optimization_level=3)

# Verify results look reasonable
# Then run on hardware
```

### 3. Use Appropriate Shot Counts

```python
# For optimization algorithms: fewer shots (100-1000)
# For final measurements: more shots (10000+)

# Adaptive shots based on stage
shots_optimization = 500
shots_final = 10000
```

### 4. Choose Backend Strategically

```python
# For testing: Use least busy backend
backend = service.least_busy(min_num_qubits=5)

# For production: Use backend matching requirements
backend = service.least_busy(operational=True, simulator=False)  # 127 qubits
```

### 5. Use Sessions for Variational Algorithms

Sessions are ideal for VQE, QAOA, and other iterative algorithms.

### 6. Monitor Job Status

```python
import time

job = sampler.run([qc], shots=1024)

while job.status() not in ['DONE', 'ERROR', 'CANCELLED']:
    print(f"Status: {job.status()}")
    time.sleep(10)

result = job.result()
```

## Troubleshooting

### Issue: "Backend not found"
```python
# List available backends
print([b.name for b in service.backends()])
```

### Issue: "Invalid credentials"
```python
# Re-save credentials
QiskitRuntimeService.save_account(
    token=getpass("IBM Cloud API key: "),
    name="research-account"
)
```

### Issue: Long queue times
```python
# Use least busy backend
backend = service.least_busy(min_num_qubits=5)

# Or use batch mode for multiple independent jobs
```

### Issue: Job fails with "Circuit too large"
```python
# Reduce circuit complexity
# Use higher transpilation optimization
qc_opt = transpile(qc, backend=backend, optimization_level=3)
```

## Backend Comparison

| Provider | Connectivity | Gate Set | Notes |
|----------|-------------|----------|--------|
| IBM Quantum | Limited | CX, RZ, SX, X | 100+ qubit systems, high quality |
| IonQ | All-to-all | GPI, GPI2, MS | Trapped ion, low error rates |
| Rigetti | Limited | CZ, RZ, RX | Superconducting qubits |
| Oxford Quantum Circuits | Limited | ECR, RZ, SX | Coaxmon technology |
