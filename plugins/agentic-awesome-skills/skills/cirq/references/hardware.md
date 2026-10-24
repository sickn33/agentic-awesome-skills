# Hardware Integration

This guide covers running quantum circuits on real quantum hardware through Cirq's device interfaces and service providers.

## Device Representation

### Device Classes

```python
import cirq

# Define device with connectivity
class MyDevice(cirq.Device):
    def __init__(self, qubits, connectivity):
        self.qubits = qubits
        self.connectivity = connectivity

    @property
    def metadata(self):
        return cirq.DeviceMetadata(
            self.qubits,
            self.connectivity
        )

    def validate_operation(self, operation):
        # Check if operation is valid on this device
        if len(operation.qubits) == 2:
            q0, q1 = operation.qubits
            if (q0, q1) not in self.connectivity:
                raise ValueError(f"Qubits {q0} and {q1} not connected")
```

### Device Constraints

```python
# Check device metadata
device = cirq_google.Sycamore

# Get qubit topology
qubits = device.metadata.qubit_set
print(f"Available qubits: {len(qubits)}")

# Check connectivity
for q0 in qubits:
    neighbors = device.metadata.nx_graph.neighbors(q0)
    print(f"{q0} connected to: {list(neighbors)}")

# Validate circuit against device
try:
    device.validate_circuit(circuit)
    print("Circuit is valid for device")
except ValueError as e:
    print(f"Invalid circuit: {e}")
```

## Qubit Selection

### Calibration-based selection

Calibration metrics map metric names to tuples of qubits and numeric values;
do not interpret `calibration.keys()` as individual qubits. Inspect the actual
metric schema, reject missing/nonfinite values, retain its timestamp, and select
a connected subset that also supports the intended two-qubit operations.
Highest individual one-qubit fidelity alone is insufficient.

### Topology-Aware Selection

```python
def select_connected_qubits(device, n_qubits):
    """Select connected qubits forming a path or grid."""
    graph = device.metadata.nx_graph
    import networkx as nx

    if n_qubits < 1:
        raise ValueError("n_qubits must be positive")
    for node in graph.nodes():
        # A BFS prefix is connected, unlike an arbitrary ego-graph node slice.
        nodes = list(nx.bfs_tree(graph, node).nodes())[:n_qubits]
        if len(nodes) == n_qubits:
            return nodes
    raise ValueError("No sufficiently large connected component")
```

Import `networkx as nx` before calling this helper. Connectivity alone does not
ensure a usable gateset, calibration quality or permitted hardware access.

## Service Providers

### Google Quantum AI (Cirq-Google)

Google hardware access is restricted to approved users. You need a Google Cloud project with the [Quantum Engine API enabled](https://console.cloud.google.com/apis/library/quantum.googleapis.com) and Application Default Credentials configured.

#### Setup

```python
import cirq_google as cg

# Authenticate via Application Default Credentials:
#   gcloud auth application-default login
# Set your GCP project ID:
#   export GOOGLE_CLOUD_PROJECT=your-project-id

import os
project_id = os.environ['GOOGLE_CLOUD_PROJECT']
engine = cg.Engine(project_id=project_id)

# List available processors (also visible in Cloud Console)
for processor in engine.list_processors():
    print(f"Processor: {processor.processor_id}")
```

#### Running on Google Hardware

```python
import cirq
import cirq_google as cg
import os

project_id = os.environ['GOOGLE_CLOUD_PROJECT']
engine = cg.Engine(project_id=project_id)

# Select a processor you have access to (e.g. weber, sycamore, willow)
processor_id = 'weber'
processor = engine.get_processor(processor_id)
device = processor.get_device()

# Create circuit on device qubits
qubits = sorted(device.metadata.qubit_set)[:5]
circuit = cirq.Circuit(
    cirq.H(qubits[0]),
    cirq.CZ(qubits[0], qubits[1]),
    cirq.measure(*qubits, key='result')
)

# Validate and run via sampler
device.validate_circuit(circuit)
sampler = engine.get_sampler(processor_id=processor_id)
result = sampler.run(circuit, repetitions=1000)
print(result.histogram(key='result'))
```

### IonQ

#### Setup

```python
import cirq_ionq as ionq

# Set API key via environment variable (recommended):
# export IONQ_API_KEY=your_api_key
# Obtain keys at: https://cloud.ionq.com/settings/keys

service = ionq.Service()  # reads IONQ_API_KEY from environment
```

#### Running on IonQ

```python
import cirq
import cirq_ionq as ionq

service = ionq.Service()  # uses IONQ_API_KEY from environment

# Create circuit (IonQ uses generic qubits)
qubits = cirq.LineQubit.range(3)
circuit = cirq.Circuit(
    cirq.H(qubits[0]),
    cirq.CNOT(qubits[0], qubits[1]),
    cirq.CNOT(qubits[1], qubits[2]),
    cirq.measure(*qubits, key='result')
)

# Run on simulator
result = service.run(
    circuit=circuit,
    repetitions=1000,
    target='simulator'
)
print(result.histogram(key='result'))

# Run on hardware
result = service.run(
    circuit=circuit,
    repetitions=1000,
    target='qpu'
)
```

#### IonQ Job Management

```python
# Create job
job = service.create_job(circuit, repetitions=1000, target='qpu')

# Check job status
status = job.status()
print(f"Job status: {status}")

# Wait for completion
job.wait_until_complete()

# Get results
results = job.results()
```

#### IonQ Calibration Data

```python
# Get current calibration
calibration = service.get_current_calibration()

# Access metrics
print(f"Fidelity: {calibration['fidelity']}")
print(f"Timing: {calibration['timing']}")
```

### Azure Quantum

#### Setup

```python
from azure.quantum.cirq import AzureQuantumService
import os

# Create service from workspace resource ID and location
# (copy from Azure Portal → your Quantum workspace header)
service = AzureQuantumService(
    resource_id=os.environ['AZURE_QUANTUM_RESOURCE_ID'],
    location=os.environ['AZURE_QUANTUM_LOCATION'],
)
```

#### Running on Azure Quantum (IonQ Backend)

```python
# List available targets
targets = service.targets()
for target in targets:
    print(f"Target: {target.name}")

# Run on IonQ simulator
result = service.run(
    circuit=circuit,
    repetitions=1000,
    target='ionq.simulator'
)

# Run on IonQ QPU
result = service.run(
    circuit=circuit,
    repetitions=1000,
    target='ionq.qpu'
)
```

#### Running on Azure Quantum (Honeywell/Quantinuum Backend)

```python
# Target names are workspace-specific; list available targets first
result = service.run(
    circuit=circuit,
    repetitions=1000,
    target='honeywell.hqs-lt-s1-apival'  # example; use service.targets() to list
)

target_info = service.get_target('honeywell.hqs-lt-s1-apival')
print(f"Target info: {target_info}")
```

### AQT (Alpine Quantum Technologies)

#### Setup

```python
import os
import cirq_aqt

# Set API token via environment variable:
# export AQT_TOKEN=your_token

service = cirq_aqt.AQTSampler(
    remote_host='https://gateway.aqt.eu',
    access_token=os.environ['AQT_TOKEN']
)
```

#### Running on AQT

```python
# Create circuit
qubits = cirq.LineQubit.range(3)
circuit = cirq.Circuit(
    cirq.H(qubits[0]),
    cirq.CNOT(qubits[0], qubits[1]),
    cirq.measure(*qubits, key='result')
)

# Run on simulator
result = service.run(
    circuit,
    repetitions=1000,
    target='simulator'
)

# Run on device
result = service.run(
    circuit,
    repetitions=1000,
    target='device'
)
```

### Pasqal

#### Setup

```python
import cirq_pasqal

# Create Pasqal device
device = cirq_pasqal.PasqalDevice(qubits=cirq.LineQubit.range(10))
```

#### Running on Pasqal

```python
# Create sampler (requires PASQAL token in environment)
import os

sampler = cirq_pasqal.PasqalSampler(
    remote_host='https://api.pasqal.cloud',
    access_token=os.environ['PASQAL_TOKEN'],
    device=device
)

# Run circuit
result = sampler.run(circuit, repetitions=1000)
```

## Hardware Best Practices

### Circuit Optimization for Hardware

```python
def optimize_for_hardware(circuit, device):
    """Optimize circuit for specific hardware."""
    from cirq.transformers import (
        optimize_for_target_gateset,
        merge_single_qubit_gates_to_phxz,
        drop_negligible_operations
    )

    # Get device gateset
    if hasattr(device, 'gateset'):
        gateset = device.gateset
    else:
        gateset = cirq.CZTargetGateset()  # Default

    # Optimize
    circuit = merge_single_qubit_gates_to_phxz(circuit)
    circuit = drop_negligible_operations(circuit)
    circuit = optimize_for_target_gateset(circuit, gateset=gateset)

    return circuit
```

### Error mitigation and job management boundaries

Readout mitigation requires a complete calibration matrix and explicit qubit/bit
ordering. The old placeholder returned raw results, so it was not mitigation.
Calibration needs 2**n preparations and additional billable shots. Validate
conditioning and uncertainties; an inverse can produce negative quasiprobabilities.

For async samplers, await `run_async` using bounded concurrency and record each
provider job ID before retrying. Coroutines are not futures with `.result()`.
Do not replay an ambiguous paid submission automatically.

Confirm provider, account, target, circuit data, shot count and budget before
remote simulator or QPU submission. Provider snippets above are historical
integration sketches: AQT/Pasqal constructors, IonQ job/calibration methods and
Azure target names require checking the installed provider documentation. They
have not been tested against live accounts.

## Device Specifications

### Checking Device Capabilities

```python
def print_device_info(device):
    """Print device capabilities and constraints."""

    print(f"Device: {device}")
    print(f"Number of qubits: {len(device.metadata.qubit_set)}")

    # Gate support
    print("\nSupported gates:")
    if hasattr(device, 'gateset'):
        for gate in device.gateset.gates:
            print(f"  - {gate}")

    # Connectivity
    print("\nConnectivity:")
    graph = device.metadata.nx_graph
    print(f"  Edges: {graph.number_of_edges()}")
    print(f"  Average degree: {sum(dict(graph.degree()).values()) / graph.number_of_nodes():.2f}")

    # Duration constraints
    if hasattr(device, 'gate_durations'):
        print("\nGate durations:")
        for gate, duration in device.gate_durations.items():
            print(f"  {gate}: {duration}")
```

## Authentication and Access

### Setting Up Credentials

**Google Cloud:**
```bash
# Install gcloud CLI: https://cloud.google.com/sdk/docs/install

# Authenticate with Application Default Credentials
gcloud auth application-default login

# Enable Quantum Engine API in your project, then set:
export GOOGLE_CLOUD_PROJECT=your-project-id
```

See [Access and authentication](https://quantumai.google/cirq/google/access) for approval requirements.

**IonQ:**
```bash
# Obtain key at https://cloud.ionq.com/settings/keys
export IONQ_API_KEY=your_api_key
```

**Azure Quantum:**
```bash
# Set workspace connection details from Azure Portal
export AZURE_QUANTUM_RESOURCE_ID=/subscriptions/.../providers/Microsoft.Quantum/Workspaces/...
export AZURE_QUANTUM_LOCATION=eastus
# See: https://quantumai.google/cirq/hardware/azure-quantum/access
```

**AQT:**
```bash
# Request access token from AQT
export AQT_TOKEN=your_token
```

**Pasqal:**
```bash
# Request API access from Pasqal
export PASQAL_TOKEN=your_token
```

## Best Practices

1. **Validate circuits before submission**: Use device.validate_circuit()
2. **Optimize for target hardware**: Decompose to native gates
3. **Select best qubits**: Use calibration data for qubit selection
4. **Monitor job status**: Check job completion before retrieving results
5. **Implement error mitigation**: Use readout error correction
6. **Batch jobs efficiently**: Submit multiple circuits together
7. **Respect rate limits**: Follow provider-specific API limits
8. **Store results**: Save expensive hardware results immediately
9. **Test on simulators first**: Validate on simulators before hardware
10. **Keep circuits shallow**: Hardware has limited coherence times
