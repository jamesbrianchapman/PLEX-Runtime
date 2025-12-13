
# PLEX Runtime™ – Pulsed Layered Exhaustive eXecution

> A deterministic runtime for exhaustive compute workloads.  
> Non-commercial MIT; commercial license required for monetized use.

---

## Table of Contents

1. [Overview](#overview)  
2. [Why PLEX Exists](#why-plex-exists)  
3. [Key Concepts](#key-concepts)  
4. [Execution Model](#execution-model)  
5. [Installation](#installation)  
6. [CLI Usage](#cli-usage)  
7. [Reference Implementation](#reference-implementation)  
8. [Dual Licensing](#dual-licensing)  
9. [Contributing](#contributing)  
10. [Contact](#contact)

---

## Overview

PLEX Runtime™ is a **reference execution engine** for exhaustive workloads that require:

- Every byte examined
- Deterministic execution
- Linear, verifiable scaling
- No sampling, no shortcuts

**Target Workloads:**

- Security and compliance scans
- Full-dataset pattern matching
- Verification and audit workloads
- Broad anomaly detection

PLEX is not a database, query language, or framework — it is a **formal execution model** with correctness-first scheduling.

---

## Why PLEX Exists

Modern data lakes and lakehouses store **petabytes of unstructured and semi-structured data**. Traditional indexed engines fail for workloads that touch:

- >8–10% of total data
- Large portions without selective keys

Problems include:

- Indexes collapse
- Latency becomes unpredictable
- Costs explode
- Coverage is incomplete

PLEX is designed for **deterministic exhaustive scanning**, enabling predictable costs, guaranteed coverage, and linear scaling.

---

## Key Concepts

PLEX Runtime™ enforces four core invariants:

1. **No shared mutable state**  
2. **No global synchronization**  
3. **Pulsed work dispatch**  
4. **Deterministic per-unit execution**

Benefits:

- Linear scaling from single-node to multi-cluster  
- Predictable saturation  
- Deterministic, reproducible results  

---

## Execution Model

PLEX decomposes work into a **layered fan-out execution tree**:

```

Controller
├─ Partition Layer
│   ├─ Chunk Layer
│   │   ├─ Scan Units

````

**Pulse Behavior:**

- Work is released in bounded pulses
- Each pulse is independently verifiable
- Pulses prevent system overload

This contrasts with traditional map-reduce or unbounded task queues.

---

## Installation

### Node.js / NPM

```bash
npm install @iconoclast/plex-runtime
````

### From Source

```bash
git clone https://github.com/jamesbrianchapman/PLEX-Runtime.git
cd PLEX-Runtime
npm install
```

---

## CLI Usage

After installation, the `plex` CLI is available:

```bash
# Run exhaustive scan on dataset
plex run ./data.json --pulse-size 32 --max-concurrency 8
```

**Options:**

* `--pulse-size`: Number of tasks per pulse
* `--max-concurrency`: Maximum concurrent tasks per node
* `--help`: Display CLI help

---

## Reference Implementation

The repository includes a **non-commercial reference runtime** demonstrating:

* Pulsed scheduling
* Deterministic task execution
* Task isolation guarantees

**Example usage:**

```javascript
const PlexRuntime = require('@iconoclast/plex-runtime');

const runtime = new PlexRuntime({ pulseSize: 32, maxConcurrency: 8 });

(async () => {
  const dataset = [...]; // Array of data items
  const results = await runtime.run(dataset, async (item) => {
    // Example scan function
    return item.value * 2;
  });
  console.log(results);
})();
```

> Note: This implementation **does not include GPU optimizations, peak saturation tuning, or proprietary pulse shaping algorithms** — those are reserved for commercial licensees.

---

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


