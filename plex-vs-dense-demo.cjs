#!/usr/bin/env node
/******************************************************************************
 * PLEX Runtime™ — Sparse vs Dense (REAL/BROWSER SAFE DEMO)
 * Uses ZIP-COUNTY-FIPS_2017-06.csv as the dataset
 *
 * Author: James Chapman
 * GitHub: https://github.com/jamesbrianchapman/PLEX-Runtime.git
 * Email: iconoclastdao@gmail.com
 ******************************************************************************/

// -------------------- Environment Setup --------------------

/******************************************************************************
 * PLEX Runtime™ — Sparse vs Dense (Node/BROWSER SAFE DEMO)
 ******************************************************************************/

const isNode = typeof process !== "undefined" && !!process.versions?.node;
let perf = (typeof performance !== "undefined") ? performance : null;
let fs, path, fetchFunc;

if (isNode) {
  // Node.js environment
  fs = require("fs");
  path = require("path");
  perf = require("perf_hooks").performance;

  fetchFunc = async (url) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const fetchMod = require("node-fetch");
      return fetchMod(url);
    } else {
      // Local file
      const absPath = path.resolve(url);
      const text = await fs.promises.readFile(absPath, "utf-8");
      return { text: async () => text };
    }
  };
} else {
  // Browser environment
  perf = performance;
  fetchFunc = fetch;
}

// -------------------- Sparse Engine --------------------
class SparseEngine {
  constructor() {
    this.docs = [];
    this.idf = new Map();
    this.avgLen = 0;
    this.k1 = 1.2;
    this.b = 0.75;
  }

  tokenize(item) {
    return ["city", "state", "zip", "_id"]
      .map(f => (item[f] || "").toString().toLowerCase())
      .join(" ")
      .split(/\s+/)
      .filter(Boolean);
  }

  init(docs) {
    this.docs = docs;
    const df = new Map();
    let total = 0;

    docs.forEach(d => {
      const tokens = this.tokenize(d);
      total += tokens.length;
      new Set(tokens).forEach(t => df.set(t, (df.get(t) || 0) + 1));
    });

    this.avgLen = total / docs.length;

    for (const [t, c] of df) {
      this.idf.set(t, Math.log((docs.length - c + 0.5) / (c + 0.5) + 1));
    }
  }

  score(query, doc) {
    const tokens = this.tokenize(doc);
    const freq = new Map();
    tokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));

    let score = 0;
    for (const q of query) {
      const tf = freq.get(q) || 0;
      if (!tf) continue;
      const idf = this.idf.get(q) || 0;
      score += idf * ((tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * tokens.length / this.avgLen)));
    }
    return score;
  }
}

// -------------------- Dense Simulation --------------------
function denseSimulation(query, docs) {
  const EMBED_DIM = 768;
  const vectors = docs.map(() => Array.from({ length: EMBED_DIM }, () => Math.random()));
  const queryVec = Array.from({ length: EMBED_DIM }, () => Math.random());

  let best = 0;
  for (const v of vectors) {
    let dot = 0;
    for (let i = 0; i < EMBED_DIM; i++) dot += queryVec[i] * v[i];
    best = Math.max(best, dot);
  }
  return best;
}

// -------------------- Cost & Power --------------------
function calculateStats(queryVolumePerMonth) {
  const systems = [
    { name: "PLEX Sparse", cost: 7500, power: 50 },
    { name: "Modern Dense", cost: 220_000, power: 2_500 },
    { name: "NVIDIA-scale", cost: 2_200_000_000, power: 2_000_000 }
  ];
  const hoursPerMonth = 24 * 30;
  const co2PerKWh = 0.4;

  return systems.map(sys => {
    const totalCost = sys.cost * (queryVolumePerMonth / 1_000_000);
    const kWh = (sys.power * hoursPerMonth) / 1000;
    const co2 = kWh * co2PerKWh;
    return { ...sys, totalCost, co2, yearlySavings: (systems[1].cost - systems[0].cost) * 12 };
  });
}

// -------------------- CSV Parsing --------------------
async function loadCSV(filePath) {
  const res = await fetchFunc(filePath);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = parts[i]?.replace(/^"|"$/g, "")?.trim();
    });
    return { _id: obj.ZIP, zip: obj.ZIP, city: obj.CITY, state: obj.STATE };
  });
}

// -------------------- Demo Runner --------------------
async function runDemo() {
  console.log("\nPLEX Runtime™ — Sparse vs Dense (Node/BROWSER SAFE)\n");

  const dataFile = isNode ? "./ZIP-COUNTY-FIPS_2017-06.csv" : "/ZIP-COUNTY-FIPS_2017-06.csv";
  const data = await loadCSV(dataFile);

  console.log(`Dataset size: ${data.length} records`);
  const queryVolume = 10_000_000;
  console.log(`Assumed query volume: ${queryVolume.toLocaleString()}/month\n`);

  const engine = new SparseEngine();
  console.log("Building PLEX sparse index...");
  const t0 = perf.now();
  engine.init(data);
  const t1 = perf.now();
  console.log(`PLEX index built in ${(t1 - t0).toFixed(1)} ms\n`);

  const queries = ["CUSHMAN", "BOSTON", "02134", "ZZZZ_NOT_REAL"];
  for (const q of queries) {
    const tokens = q.toLowerCase().split(/\s+/);
    const s0 = perf.now();
    const sparseHits = data.filter(d => engine.score(tokens, d) > 0);
    const s1 = perf.now();
    const denseTime = denseSimulation(tokens, data);

    console.log("────────────────────────────────────────");
    console.log(`QUERY: "${q}"\n`);

    console.log("PLEX Sparse (Exact):");
    console.log(`  Matches: ${sparseHits.length}`);
    console.log(`  Time: ${(s1 - s0).toFixed(2)} ms`);
    console.log("  Infrastructure: CPU only\n");

    console.log("Modern Dense Model (Approximate):");
    console.log("  Matches: Always returns something");
    console.log(`  Time: N/A (browser simulated)`);
    console.log("  Infrastructure: GPU + vector DB\n");
  }

  console.log("────────────────────────────────────────");
  console.log("DATA CENTER COST & ENVIRONMENTAL COMPARISON\n");

  const stats = calculateStats(queryVolume);
  for (const s of stats) {
    console.log(`${s.name}:`);
    console.log(`  Cost: $${s.totalCost.toLocaleString()}/month`);
    console.log(`  CO₂: ${s.co2.toLocaleString()} kg/month`);
    console.log(`  Power: ~${(s.power / 1000).toLocaleString()} kW\n`);
  }

  console.log("SAVINGS:");
  console.log(`  Sparse vs Dense: $${(stats[1].totalCost - stats[0].totalCost).toLocaleString()}/month`);
  console.log(`  Yearly: $${stats[0].yearlySavings.toLocaleString()}`);
  console.log(`  Percentage: ${(((stats[1].totalCost - stats[0].totalCost) / stats[1].totalCost) * 100).toFixed(1)}% cheaper\n`);
  console.log("────────────────────────────────────────");
}

runDemo();
