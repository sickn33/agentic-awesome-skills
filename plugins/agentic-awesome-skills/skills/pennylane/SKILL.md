---
name: pennylane
description: "Write, simulate and train PennyLane quantum circuits: QNodes, devices, templates, measurements, autodiff with NumPy/JAX/PyTorch, gradients, shots and noise."
category: development
risk: safe
source: self
source_type: self
date_added: "2026-11-15"
author: nazmulislam-lab
tags: [pennylane, quantum-computing, quantum-machine-learning, variational-circuits, autodiff, python]
---

# PennyLane

## Overview

PennyLane is Xanadu's open-source Python library for differentiable quantum programming. This skill helps an agent write PennyLane code that runs on the current release: build QNodes, pick a device and differentiation method, compose templates, choose measurements, train variational circuits with NumPy (autograd), JAX or PyTorch, control shots, and simulate noise with mixed states.

It targets **PennyLane 0.45.x** (0.45.1 on PyPI at the time of writing). From v0.45 the official docs import the package as `qp` (`import pennylane as qp`); the older `qml` alias is just a different local name for the same module, so existing `qml.` code keeps working.

The repository's `qiskit` and `cirq` skills cover IBM's and Google's circuit frameworks and their hardware runtimes. This skill covers what is specific to PennyLane: QNodes that are differentiable end to end, interface-agnostic autodiff, gradient-method selection and the device plugin model. It covers local simulation; it does not cover submitting jobs to remote hardware.

## When to Use

- The user asks for PennyLane code: a QNode, a variational circuit, a VQE, a quantum classifier or another hybrid quantum-classical model.
- The user needs gradients of a quantum circuit, wants to switch between autograd, JAX and PyTorch, or must choose between `backprop`, `adjoint` and `parameter-shift`.
- Existing PennyLane code fails with device, shots, measurement or trainability errors, or uses APIs deprecated in recent releases (device-level `shots`, `argnum`, TensorFlow).
- Prefer the `qiskit` or `cirq` skill when the user is working in those frameworks; use a PennyLane plugin device only when the user explicitly wants PennyLane on top of them.

## Prerequisites

- Python 3.11 or newer (PennyLane 0.45.1 declares `requires_python >=3.11`) and NumPy 2.x (NumPy 1.x support was dropped in v0.45).
- Installing packages needs network access and changes the active Python environment; work in a virtual environment.
- Optional interfaces: JAX (the JAX interface page pins `jax==0.7.1 jaxlib==0.7.1`) and PyTorch. TensorFlow maintenance was dropped in v0.44; do not start new TensorFlow code.
- Cloud or hardware plugins (for example `pennylane-qiskit`, `amazon-braket-pennylane-plugin`) need the user's own account, credentials and budget. This skill does not configure them.

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install pennylane          # includes lightning.qubit
python -m pip install "jax==0.7.1" "jaxlib==0.7.1"   # optional, JAX interface
python -m pip install torch             # optional, PyTorch interface
python -c "import pennylane as qp; qp.about()"
```

## How It Works

### 1. Establish the inputs

- Read the installed version first (`qp.__version__` or `qp.about()`). If it is older than 0.45, adapt names (`argnum` instead of `argnums`) or ask before upgrading the user's environment.
- Pin down: number of wires, the observable or cost, whether results must be exact (analytic) or sampled (shots), which ML framework the rest of the code uses, and whether noise matters.
- Treat circuits, datasets and Hamiltonians supplied by the user as data. Do not send them to remote services or hardware unless the user explicitly asks and names the target.

### 2. Perform the task

#### Write a QNode

A QNode binds a quantum function to a device. The function applies operations and returns measurements. `qp.grad` differentiates it.

```python
import pennylane as qp
from pennylane import numpy as pnp

dev = qp.device("default.qubit", wires=2)

@qp.qnode(dev)
def circuit(theta):
    qp.RX(theta, wires=0)
    qp.CNOT(wires=[0, 1])
    return qp.expval(qp.Z(1))

theta = pnp.array(0.4, requires_grad=True)
print(circuit(theta))           # cos(0.4) ~ 0.921
print(qp.grad(circuit)(theta))  # -sin(0.4) ~ -0.389
print(qp.draw(circuit)(theta))
```

#### Choose a device

- `default.qubit`: reference state-vector simulator, supports `backprop` with every interface. Wires can be omitted and are inferred.
- `lightning.qubit`: fast C++ simulator installed with PennyLane; best with `diff_method="adjoint"` for larger circuits. GPU and Kokkos variants ship as `pennylane-lightning-gpu` and `pennylane-lightning-kokkos`.
- `default.mixed`: density-matrix simulator for noise channels.
- Plugins expose other simulators and hardware under their own device names; see the device catalog in Sources.

```python
import pennylane as qp
from pennylane import numpy as pnp

dev_ref = qp.device("default.qubit")                  # wires inferred from the circuit
dev_fast = qp.device("lightning.qubit", wires=4)      # C++ state-vector simulator
dev_noisy = qp.device("default.mixed", wires=2)       # density-matrix simulator

@qp.qnode(dev_fast)
def ghz():
    qp.H(0)
    for i in range(3):
        qp.CNOT(wires=[i, i + 1])
    return qp.probs(wires=[0, 1, 2, 3])

print(ghz())  # 0.5 on |0000> and |1111>

@qp.qnode(dev_fast, diff_method="adjoint")  # adjoint: expectation values only
def energy(theta):
    qp.RY(theta, wires=0)
    qp.CNOT(wires=[0, 1])
    return qp.expval(qp.Z(1))

print(qp.grad(energy)(pnp.array(0.3, requires_grad=True)))  # -sin(0.3) ~ -0.296
```

#### Measurements

Return one measurement or a tuple. `expval`, `var`, `probs`, `state` and `density_matrix` work analytically; `sample` and `counts` require finite shots.

```python
import pennylane as qp

dev = qp.device("default.qubit", wires=2)

@qp.qnode(dev)
def analytic(x):
    qp.RY(x, wires=0)
    qp.CNOT(wires=[0, 1])
    return (
        qp.expval(qp.Z(0)),
        qp.var(qp.X(1)),
        qp.probs(wires=[0, 1]),
        qp.density_matrix(wires=[0]),
    )

print(analytic(0.7))

@qp.set_shots(100)
@qp.qnode(dev)
def sampled():
    qp.H(0)
    qp.CNOT(wires=[0, 1])
    return qp.counts(), qp.sample(qp.Z(0))

counts, samples = sampled()
print(counts, samples.shape)  # e.g. {'00': 52, '11': 48} (100,)

@qp.qnode(dev)
def full_state():
    qp.H(0)
    return qp.state()

print(full_state())
```

#### Templates

Templates are reusable layer blocks such as embeddings (`AngleEmbedding`, `AmplitudeEmbedding`, `IQPEmbedding`) and trainable layers (`StronglyEntanglingLayers`, `BasicEntanglerLayers`). Use the template's `shape()` helper to size weights instead of hard-coding them. `qp.draw(..., level="device")` shows the decomposed gates.

```python
import pennylane as qp
from pennylane import numpy as pnp

n_wires, n_layers = 3, 2
dev = qp.device("default.qubit", wires=n_wires)

@qp.qnode(dev)
def model(features, weights):
    qp.AngleEmbedding(features, wires=range(n_wires), rotation="Y")
    qp.StronglyEntanglingLayers(weights, wires=range(n_wires))
    return qp.expval(qp.Z(0))

shape = qp.StronglyEntanglingLayers.shape(n_layers=n_layers, n_wires=n_wires)
print(shape)  # (2, 3, 3)
weights = pnp.random.random(size=shape, requires_grad=True)
features = pnp.array([0.1, 0.2, 0.3], requires_grad=False)
print(model(features, weights))
print(qp.draw(model, level="device")(features, weights))
```

#### Autodiff interfaces

The interface is detected from the argument types, or set with `interface=`. Use `pennylane.numpy` with `requires_grad=True` for autograd, `jax.numpy` arrays for JAX and `torch.tensor(..., requires_grad=True)` for PyTorch.

JAX (enable 64-bit floats, which JAX does not use by default):

```python
import jax
import jax.numpy as jnp
import pennylane as qp

jax.config.update("jax_enable_x64", True)  # JAX defaults to float32
dev = qp.device("default.qubit", wires=2)

@qp.qnode(dev, interface="jax")
def circuit(params):
    qp.RX(params[0], wires=0)
    qp.RY(params[1], wires=1)
    qp.CNOT(wires=[0, 1])
    return qp.expval(qp.Z(0) @ qp.Z(1))

params = jnp.array([0.1, 0.2])
print(circuit(params))
print(jax.jit(jax.grad(circuit))(params))
```

PyTorch with a native `torch.optim` optimizer:

```python
import torch
import pennylane as qp

dev = qp.device("default.qubit", wires=1)

@qp.qnode(dev, interface="torch")
def circuit(x):
    qp.RX(x[0], wires=0)
    qp.RY(x[1], wires=0)
    return qp.expval(qp.Z(0))

x = torch.tensor([0.5, 0.1], requires_grad=True)
opt = torch.optim.Adam([x], lr=0.1)
for step in range(50):
    opt.zero_grad()
    loss = circuit(x)  # minimize <Z>, target -1
    loss.backward()
    opt.step()
print(loss.item())  # moves toward -1
```

#### Gradient methods

Set `diff_method=` on the QNode. The default `"best"` picks a method supported by the device.

- `backprop`: classical backpropagation through the simulator; fastest for small to medium simulated circuits; analytic mode only.
- `adjoint`: memory-efficient reverse-mode method on `default.qubit` and `lightning.qubit`; analytic mode and expectation values only.
- `parameter-shift`: evaluates shifted circuits (two per parameter for standard rotation gates); works with shots and on hardware.
- `finite-diff`, `hadamard` and `spsa` are also available; see the gradients documentation.

```python
import pennylane as qp
from pennylane import numpy as pnp

def make(device_name, diff_method):
    dev = qp.device(device_name, wires=2)

    @qp.qnode(dev, diff_method=diff_method)
    def circuit(w):
        qp.RX(w[0], wires=0)
        qp.RY(w[1], wires=1)
        qp.CNOT(wires=[0, 1])
        return qp.expval(qp.Z(1))

    return circuit

w = pnp.array([0.3, 0.8], requires_grad=True)
for device_name, method in [
    ("default.qubit", "backprop"),         # fastest for small simulated circuits
    ("lightning.qubit", "adjoint"),        # memory-efficient, simulators only
    ("default.qubit", "parameter-shift"),  # hardware-compatible, 2 evals per parameter
]:
    print(method, qp.grad(make(device_name, method))(w))
```

#### Shots

Device-level `shots=` is deprecated since v0.43. Set shots on the QNode (`@qp.qnode(dev, shots=1000)`) or with the `qp.set_shots` transform, which also switches an existing QNode back to analytic mode with `None` or to a shot vector with a list.

```python
import pennylane as qp
from pennylane import numpy as pnp

dev = qp.device("default.qubit", wires=1)

@qp.qnode(dev, shots=1000, diff_method="parameter-shift")
def circuit(x):
    qp.RX(x, wires=0)
    return qp.expval(qp.Z(0))

x = pnp.array(0.5, requires_grad=True)
print(circuit(x))                          # stochastic estimate of cos(0.5)
print(qp.grad(circuit)(x))                 # stochastic estimate of -sin(0.5)
print(qp.set_shots(circuit, None)(x))      # same circuit, analytic
print(qp.set_shots(circuit, [10, 100, 1000])(x))  # shot vector: one result per entry
```

#### Optimizers and variational workflows

With autograd, PennyLane ships `GradientDescentOptimizer`, `AdamOptimizer`, `QNGOptimizer`, `SPSAOptimizer`, `RotosolveOptimizer` and others; `step_and_cost` returns the new parameters and the previous cost. With PyTorch use `torch.optim`; with JAX use Optax.

Ground-state energy of a small Hamiltonian (VQE pattern), checked against exact diagonalization:

```python
import pennylane as qp
from pennylane import numpy as pnp

H = qp.Hamiltonian([0.5, 0.8, -0.3], [qp.Z(0), qp.X(0) @ qp.X(1), qp.Z(1)])
dev = qp.device("default.qubit", wires=2)

@qp.qnode(dev)
def energy(params):
    qp.RY(params[0], wires=0)
    qp.RY(params[1], wires=1)
    qp.CNOT(wires=[0, 1])
    qp.RY(params[2], wires=0)
    return qp.expval(H)

opt = qp.AdamOptimizer(stepsize=0.1)
params = pnp.array([0.1, 0.1, 0.1], requires_grad=True)
for step in range(150):
    params, e = opt.step_and_cost(energy, params)
print("final energy", energy(params))

exact = min(qp.eigvals(H))
print("exact ground energy", exact)
```

A small quantum classifier built from templates:

```python
import pennylane as qp
from pennylane import numpy as pnp

pnp.random.seed(0)
n_wires = 2
dev = qp.device("default.qubit", wires=n_wires)

@qp.qnode(dev)
def model(x, weights):
    qp.AngleEmbedding(x, wires=range(n_wires))
    qp.StronglyEntanglingLayers(weights, wires=range(n_wires))
    return qp.expval(qp.Z(0))

X = pnp.array([[0.0, 0.0], [0.0, 3.0], [3.0, 0.0], [3.0, 3.0]], requires_grad=False)
Y = pnp.array([1.0, -1.0, -1.0, 1.0], requires_grad=False)  # XOR-like labels in {-1, +1}

def cost(weights):
    preds = pnp.stack([model(x, weights) for x in X])
    return pnp.mean((preds - Y) ** 2)

shape = qp.StronglyEntanglingLayers.shape(n_layers=2, n_wires=n_wires)
weights = pnp.random.uniform(0, 2 * pnp.pi, size=shape, requires_grad=True)
opt = qp.AdamOptimizer(stepsize=0.1)
for step in range(100):
    weights, loss = opt.step_and_cost(cost, weights)
print("final loss", cost(weights))
print("predictions", pnp.sign(pnp.stack([model(x, weights) for x in X])))
```

#### Noise and mixed states

Use `default.mixed` with channels such as `DepolarizingChannel`, `AmplitudeDamping`, `PhaseDamping` and `BitFlip`, and read mixed-state quantities such as `density_matrix` and `purity`. To keep a noiseless circuit unchanged, build a `qp.NoiseModel` and apply it with `qp.add_noise`.

```python
import pennylane as qp

dev = qp.device("default.mixed", wires=2)

@qp.qnode(dev)
def noisy_bell(p):
    qp.H(0)
    qp.CNOT(wires=[0, 1])
    qp.DepolarizingChannel(p, wires=0)
    qp.AmplitudeDamping(0.1, wires=1)
    return qp.expval(qp.Z(0) @ qp.Z(1)), qp.purity(wires=[0, 1])

print(noisy_bell(0.0))
print(noisy_bell(0.2))

# Attach a noise model to an existing noiseless QNode instead of editing it
@qp.qnode(dev)
def bell():
    qp.H(0)
    qp.CNOT(wires=[0, 1])
    return qp.density_matrix(wires=[0, 1])

fcond = qp.noise.op_eq(qp.CNOT)
noise = qp.noise.partial_wires(qp.BitFlip, 0.05)
model = qp.NoiseModel({fcond: noise})
noisy = qp.add_noise(bell, model)
print(qp.draw(noisy)())
print(noisy().real.round(3))
```

#### Common pitfalls

- Plain NumPy arrays or Python floats are not trainable under autograd; `qp.grad` warns and returns `()`.
- `qp.grad`, `qp.jacobian`, `qp.jvp` and `qp.vjp` take `argnums` from v0.45 (previously `argnum`).
- `sample()` and `counts()` raise `DeviceError` in analytic mode; set shots.
- `backprop` and `adjoint` need analytic execution; with finite shots use `parameter-shift`.
- `adjoint` supports expectation values; requesting `probs` with it raises `QuantumFunctionError`.
- JAX defaults to float32; call `jax.config.update("jax_enable_x64", True)` at startup.
- PyTorch inputs in float32 are promoted to float64 inside QNodes, which increases memory use.
- Do not pass `shots=` to `qp.device` in new code, and do not start new TensorFlow-interface code.

```python
import numpy as np
import pennylane as qp
from pennylane import numpy as pnp

dev = qp.device("default.qubit", wires=1)

@qp.qnode(dev)
def circuit(x, y):
    qp.RX(x, wires=0)
    qp.RY(y, wires=0)
    return qp.expval(qp.Z(0))

# 1. Plain NumPy / Python floats are NOT trainable under the autograd interface:
#    qp.grad warns "Attempted to differentiate a function with no trainable parameters"
#    and returns an empty tuple.
print(qp.grad(circuit)(np.float64(0.2), np.float64(0.3)))  # ()

# 2. Fix: use pennylane.numpy with requires_grad, or name arguments with argnums
x = pnp.array(0.2, requires_grad=True)
y = pnp.array(0.3, requires_grad=False)
print(qp.grad(circuit)(x, y))                        # d/dx only
print(qp.grad(circuit, argnums=[0, 1])(0.2, 0.3))    # argnums (was argnum before v0.45)

# 3. sample()/counts() need finite shots; analytic mode raises DeviceError
@qp.qnode(dev)
def sampler(x):
    qp.RX(x, wires=0)
    return qp.sample(qp.Z(0))

try:
    sampler(0.1)
except qp.exceptions.DeviceError as err:
    print("DeviceError:", err)
print(qp.set_shots(sampler, 5)(0.1))

# 4. backprop and adjoint need analytic (shots=None) execution
@qp.qnode(dev, diff_method="backprop", shots=100)
def bad(x):
    qp.RX(x, wires=0)
    return qp.expval(qp.Z(0))

try:
    qp.grad(bad)(pnp.array(0.2, requires_grad=True))
except qp.exceptions.QuantumFunctionError as err:
    print("QuantumFunctionError:", err)
```

### 3. Verify the result

- Run the code. For small circuits, compare against a value you can compute by hand or by exact diagonalization (`qp.eigvals`), as the VQE example does.
- Check gradients by comparing two methods (for example `backprop` against `parameter-shift`), as in the gradient-method example.
- With shots, expect statistical error of order 1/sqrt(shots); report sampled numbers as estimates, not exact values.
- Print the circuit with `qp.draw` and confirm wires, gates and measurements match the request.
- If something cannot be run locally (a hardware plugin, a missing optional package), say so and do not report the expected output as a measured result.

## Examples

```text
User request: "Write a PennyLane VQE for H = 0.5 Z0 + 0.8 X0 X1 - 0.3 Z1 and check it."
Inputs: Hamiltonian coefficients and Pauli terms, 2 wires, analytic simulation.
Expected result: a QNode returning qp.expval(H), an AdamOptimizer loop, and a final
energy close to min(qp.eigvals(H)). Illustrative output from the example above on
PennyLane 0.45.1: final energy -1.13137 versus exact -1.13137.
```

```text
User request: "My PennyLane gradient comes back as an empty tuple."
Inputs: the user's QNode and call site.
Expected result: identify that the arguments are plain NumPy/float values under autograd,
then switch them to pennylane.numpy arrays with requires_grad=True or pass argnums.
```

## Limitations

- Written and tested against PennyLane 0.45.1 with pennylane-lightning 0.45.0, JAX 0.7.1 and PyTorch 2.9.1 (CPU) on Python 3.13. APIs listed in the deprecations page change between releases; re-check them for other versions.
- Does not cover Catalyst/`qp.qjit`, program capture, pulse programming, the `qchem` module, resource estimation or fault-tolerant tooling beyond naming them.
- Hardware and cloud plugin examples are not included and were not tested; device names, options, queue times and costs depend on the provider and the user's account.
- Small examples converge quickly. Do not infer that a larger variational model will train well; barren plateaus, local minima and shot noise need separate checks.
- Optimizer runs and sampled results are stochastic; the printed numbers in comments are illustrative.

## Safety and side effects

- Simulation runs locally and sends no data out. Installing packages with pip downloads from PyPI and changes the active environment.
- Hardware or cloud execution through plugins can consume paid credits and sends circuits to a third party. Do it only after the user explicitly names the provider, device and budget, and keep API tokens in the provider's own configuration or environment variables, never in code, outputs or tracked files.
- Long training loops and large wire counts can use significant CPU time and memory (state-vector memory doubles with each added wire). Start small and tell the user before scaling up.

## Sources and related skills

- PennyLane on PyPI (latest version, Python requirement): https://pypi.org/project/PennyLane/
- Installation: https://pennylane.ai/install
- Release notes (v0.45 changes: `qp` alias in docs, `argnums`, NumPy 2 requirement): https://docs.pennylane.ai/en/stable/development/release_notes.html
- Deprecations (device-level shots, TensorFlow): https://docs.pennylane.ai/en/stable/development/deprecations.html
- Quantum circuits and QNodes: https://docs.pennylane.ai/en/stable/introduction/circuits.html
- QNode API: https://docs.pennylane.ai/en/stable/code/api/pennylane.QNode.html
- `set_shots`: https://docs.pennylane.ai/en/stable/code/api/pennylane.set_shots.html
- Measurements: https://docs.pennylane.ai/en/stable/introduction/measurements.html
- Templates: https://docs.pennylane.ai/en/stable/introduction/templates.html
- Quantum operators and noise channels: https://docs.pennylane.ai/en/stable/introduction/operations.html
- Gradients, interfaces and optimizers: https://docs.pennylane.ai/en/stable/introduction/interfaces.html
- JAX interface: https://docs.pennylane.ai/en/stable/introduction/interfaces/jax.html
- PyTorch interface: https://docs.pennylane.ai/en/stable/introduction/interfaces/torch.html
- NumPy (autograd) interface: https://docs.pennylane.ai/en/stable/introduction/interfaces/numpy.html
- Parameter-shift gradient transform: https://docs.pennylane.ai/en/stable/code/api/pennylane.gradients.param_shift.html
- Noise models (`qp.noise`, `add_noise`): https://docs.pennylane.ai/en/stable/code/qml_noise.html
- `default.mixed` device: https://docs.pennylane.ai/en/stable/code/api/pennylane.devices.default_mixed.DefaultMixed.html
- Lightning simulators: https://docs.pennylane.ai/projects/lightning/en/stable/
- Device and plugin catalog: https://pennylane.ai/devices
- Related skills in this repository: `qiskit`, `cirq`.
