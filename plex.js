#!/usr/bin/env node
/******************************************************************************
 * PLEX Runtime™ CLI
 * Browser-safe, pure JavaScript
 *
 * Owner: James-Brian-Chapman
 ******************************************************************************/

//////////////////////
// Utility Functions
//////////////////////

const readJSON = async (path) =>
  JSON.parse(await fetchFile(path));

const fetchFile = async (path) => {
  if (typeof window !== "undefined") {
    return (await fetch(path)).text();
  } else {
    const fs = await import("fs/promises");
    return fs.readFile(path, "utf8");
  }
};

const writeJSON = async (path, data) => {
  if (typeof window !== "undefined") {
    console.warn("Browser mode: write disabled");
  } else {
    const fs = await import("fs/promises");
    await fs.writeFile(path, JSON.stringify(data, null, 2));
  }
};

//////////////////////
// Vector Engine
//////////////////////

class VectorEngine {
  static tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }

  static vectorize(text) {
    const tokens = this.tokenize(text);
    const map = {};
    tokens.forEach(t => (map[t] = (map[t] || 0) + 1));
    return map;
  }

  static cosine(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (const k in a) {
      if (b[k]) dot += a[k] * b[k];
      magA += a[k] * a[k];
    }
    for (const k in b) magB += b[k] * b[k];
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
  }
}

//////////////////////
// PLEX Runtime Core
//////////////////////

class PlexRuntime {
  constructor({ pulseSize = 32, maxConcurrency = 8 }) {
    this.pulseSize = pulseSize;
    this.maxConcurrency = maxConcurrency;
    this.active = 0;
  }

  async run(dataset, fn) {
    const tasks = dataset.map((d, i) => ({ id: i, data: d }));
    const results = [];

    for (let i = 0; i < tasks.length; i += this.pulseSize) {
      const pulse = tasks.slice(i, i + this.pulseSize);
      await this.executePulse(pulse, fn, results);
    }

    return results;
  }

  async executePulse(pulse, fn, results) {
    const inflight = [];

    for (const task of pulse) {
      while (this.active >= this.maxConcurrency) {
        await Promise.race(inflight);
      }

      this.active++;

      const exec = (async () => {
        try {
          results.push({
            id: task.id,
            result: await fn(task.data)
          });
        } finally {
          this.active--;
        }
      })();

      inflight.push(exec);
    }

    await Promise.all(inflight);
  }
}

//////////////////////
// CLI Helpers
//////////////////////

const getFlag = (args, name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};

const showHelp = () => {
  console.log(`
PLEX Runtime v0.1.1

Usage:
  plex-runtime init
  plex-runtime scan <file> --pattern <text>
  plex-runtime vectorize <file>
  plex-runtime search <vectors.json> --query <text>
  plex-runtime help

Description:
  Deterministic pulse-based execution runtime with
  lightweight vector search capabilities.

Examples:
  plex-runtime init
  plex-runtime vectorize data.json
  plex-runtime search vectors.json --query "hello"
`);
};

//////////////////////
// CLI Commands
//////////////////////

async function main() {
  const [, , cmd, ...args] = process.argv;

  if (!cmd || cmd === "--help" || cmd === "help") {
    showHelp();
    process.exit(0);
  }

  if (cmd === "init") {
    await writeJSON("plex.config.json", {
      pulseSize: 32,
      maxConcurrency: 8
    });
    console.log("PLEX config initialized");
    return;
  }

  if (cmd === "scan") {
    const file = args[0];
    const pattern = getFlag(args, "--pattern");

    if (!file || !pattern) {
      console.error("scan requires <file> --pattern <text>");
      process.exit(1);
    }

    const data = await readJSON(file);
    const runtime = new PlexRuntime({});
    const res = await runtime.run(data, d =>
      JSON.stringify(d).includes(pattern)
    );
    console.log(res.filter(r => r.result));
    return;
  }

  if (cmd === "vectorize") {
    const file = args[0];
    if (!file) {
      console.error("vectorize requires <file>");
      process.exit(1);
    }

    const data = await readJSON(file);
    const vectors = data.map(d =>
      VectorEngine.vectorize(JSON.stringify(d))
    );
    await writeJSON("vectors.json", vectors);
    console.log("Vectors written to vectors.json");
    return;
  }

  if (cmd === "search") {
    const file = args[0];
    const query = getFlag(args, "--query");

    if (!file || !query) {
      console.error("search requires <vectors.json> --query <text>");
      process.exit(1);
    }

    const vectors = await readJSON(file);
    const qv = VectorEngine.vectorize(query);
    const ranked = vectors
      .map((v, i) => ({
        id: i,
        score: VectorEngine.cosine(v, qv)
      }))
      .sort((a, b) => b.score - a.score);

    console.log(ranked.slice(0, 10));
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  showHelp();
  process.exit(1);
}

if (typeof process !== "undefined") {
  main();
}
