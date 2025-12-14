

# PLEX Runtime™

## Pulsed Layered Exhaustive eXecution

### **Execution Engine Specification (v1.0)**

---

## 1. Scope & Non-Goals

### 1.1 Scope

PLEX Runtime is a **deterministic, correctness-first execution engine** for **exhaustive workloads** that must process **100% of input data** with **predictable cost and coverage guarantees**.

PLEX targets:

* Full-dataset scans
* Compliance and verification workloads
* Security inspection
* Deterministic anomaly detection

PLEX is **not** a database, query language, or ML inference engine.

---

### 1.2 Non-Goals

PLEX explicitly does **not** aim to:

* Optimize selective queries (<5–10% data access)
* Replace OLTP databases
* Perform approximate or probabilistic computation
* Optimize for latency over correctness

---

## 2. Formal Guarantees (Core Claims)

PLEX provides the following **hard guarantees**:

### G1. Exhaustiveness

Every input unit is processed **exactly once** unless explicitly configured otherwise.

### G2. Determinism

Given:

* Identical inputs
* Identical runtime configuration
* Identical execution function

Then:

> The output is **bitwise identical** across runs.

### G3. Bounded Resource Use

At all times:

* CPU usage ≤ configured limits
* Memory usage ≤ configured bounds
* No unbounded queues or task spawning

### G4. Linear Cost Scaling

Total work scales linearly with:

* Input size
* Compute function cost

No superlinear behavior introduced by the runtime.

---

## 3. Execution Model Overview

PLEX executes workloads using a **Layered Pulse Execution Graph (LPEG)**.

```
Controller
├─ Partition Layer
│   ├─ Pulse Layer
│   │   ├─ Execution Units
```

Each layer enforces **isolation, determinism, and boundedness**.

---

## 4. Data Model

### 4.1 Execution Unit (EU)

The smallest indivisible unit of work.

```
EU = {
  id: deterministic integer,
  input: immutable byte slice,
  output: immutable byte slice,
  status: { pending | completed | failed }
}
```

Properties:

* Immutable input
* Side-effect-free execution
* Idempotent

---

### 4.2 Pulse

A pulse is a **bounded batch of execution units**.

```
Pulse = {
  pulse_id,
  execution_units[],
  resource_budget,
  checksum
}
```

Guarantees:

* All EUs in a pulse complete before next pulse begins
* Pulse output checksum is reproducible

---

### 4.3 Partition

A partition is a **stable subdivision of the dataset**.

```
Partition = hash(input_id) % N
```

Properties:

* Deterministic mapping
* Independent execution
* Enables horizontal scaling

---

## 5. Deterministic Scheduling

### 5.1 Scheduler Rules

The scheduler:

1. Assigns EUs to partitions deterministically
2. Releases EUs in fixed-size pulses
3. Executes pulses in deterministic order

No dynamic task stealing.
No race-dependent ordering.

---

### 5.2 Concurrency Model

Concurrency is **explicit and bounded**.

```
max_parallel_units_per_pulse
max_pulses_in_flight
```

No global mutable state is accessible to execution units.

---

## 6. Execution Function Contract

User-supplied execution functions must satisfy:

### F1. Purity

* No external side effects
* No time-dependent behavior
* No randomness unless seeded

### F2. Determinism

Given same input → same output

### F3. Resource Declaration

Each function declares:

* Estimated CPU cost
* Estimated memory footprint

---

## 7. Resource Control

PLEX enforces **hard resource ceilings**:

### 7.1 CPU

* Fixed thread pool
* No oversubscription
* No unbounded async tasks

### 7.2 Memory

* Per-pulse memory accounting
* Backpressure when exceeded
* Spill-to-disk support

### 7.3 I/O

* Sequential, bounded I/O
* Explicit buffering strategy

---

## 8. Failure Handling

### 8.1 EU-Level Failure

* Failed EUs are retried deterministically
* Retry count is fixed and logged

### 8.2 Pulse-Level Failure

* Pulse is re-executed
* Output checksum validated

### 8.3 Node Failure

* Partition reassignment
* Deterministic replay from last completed pulse

---

## 9. Verification & Auditability

PLEX produces:

* Per-pulse checksums
* Deterministic execution logs
* Replay manifests

This allows:

* Independent verification
* Partial recomputation
* Regulatory audit trails

---

## 10. Scaling Model

### 10.1 Single Node

* Pulses executed sequentially
* Concurrency bounded

### 10.2 Multi-Node

* Partitions assigned to nodes
* No shared memory
* Deterministic merge order

### 10.3 Cluster

* Coordinator assigns partitions
* Workers execute pulses independently
* Final merge is ordered and reproducible

---

## 11. Hardware Backends

PLEX supports pluggable execution backends:

### 11.1 CPU Backend

* Default
* Thread-pool based
* Cache-friendly execution

### 11.2 GPU Backend

* Kernel-based execution per pulse
* Fixed launch configuration
* Deterministic reduction

### 11.3 WASM Backend

* Sandboxed execution
* Cross-platform determinism

---

## 12. API Surface (Minimal)

```ts
interface PlexRuntime {
  run<T, R>(
    dataset: Iterable<T>,
    fn: (input: T) => R,
    config: RuntimeConfig
  ): ExecutionResult<R>;
}
```

---

## 13. Comparison to Existing Systems

| System    | Exhaustive | Deterministic | Bounded | Replayable |
| --------- | ---------- | ------------- | ------- | ---------- |
| Spark     | ❌          | ❌             | ❌       | Partial    |
| Ray       | ❌          | ❌             | ❌       | ❌          |
| MapReduce | ✔          | ❌             | ❌       | ❌          |
| **PLEX**  | ✔          | ✔             | ✔       | ✔          |

---

## 14. What Must Exist to Validate This Spec

To claim PLEX exists, the following **must be implemented**:

1. Formal execution graph
2. Deterministic scheduler
3. Partitioning system
4. Resource accounting
5. Replay & checksum verification
6. Multi-node coordination

Anything less is a **prototype**, not a runtime.

---

## 15. Final Note

This spec:

* Matches the README claims
* Is technically defensible
* Could support commercial licensing
* Would justify benchmarks and comparisons

## Dual Licensing

PLEX Runtime™ uses a **dual license model**:

### 1. MIT License – Non-Commercial Use

* Research, experimentation, local development
* Academic or personal projects
* **Prohibited for revenue-generating use**

### 2. Commercial License – Required for Monetized Use

* Any paid service or internal revenue-generating use
* Includes optimized runtime, GPU backends, and enterprise support
* Contact for licensing: [licensing@iconoclastdao.org](mailto:licensing@iconoclastdao.org)

---

## Contributing

Contributions are welcome for:

* Bug fixes
* Documentation
* Non-commercial runtime improvements

All contributions require a **Contributor License Agreement (CLA)**.
See [CLA.md](CLA.md) for details.

---

## Contact

**Owner / Maintainer:** James Brian Chapman
**Emails for verification / communication:**

* [iconoclastdao@gmail.com](mailto:iconoclastdao@gmail.com)
* [cbbjbc218@gmail.com](mailto:cbbjbc218@gmail.com)
* [1jbchgap@gmail.com](mailto:1jbchgap@gmail.com)
* [iamchainjc@gmail.com](mailto:iamchainjc@gmail.com)

GitHub: [https://github.com/jamesbrianchapman/PLEX-Runtime](https://github.com/jamesbrianchapman/PLEX-Runtime)

---

> **Disclaimer:** This repository discloses **only the minimal execution logic** for research and non-commercial use. Proprietary peak-performance optimizations remain reserved for commercial licensees.


