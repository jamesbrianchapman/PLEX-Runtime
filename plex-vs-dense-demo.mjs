#!/usr/bin/env node
/******************************************************************************
 * PLEX Runtime™ — Sparse vs Dense (Optimized + Detailed Cost/CO₂ Comparison)
 ******************************************************************************/

const isNode = typeof process !== "undefined" && !!process.versions?.node;

let perf = (typeof performance !== "undefined") ? performance : null;
let fetchFunc;

async function setupEnvironment() {
  if (isNode) {
    const fs = await import("fs");
    const path = await import("path");
    const { performance: perf_hooks } = await import("perf_hooks");
    perf = perf_hooks;

    fetchFunc = async (url) => {
      if (/^https?:\/\//.test(url)) {
        const mod = await import("node-fetch");
        return mod.default(url);
      } else {
        const absPath = path.resolve(url);
        const text = await fs.promises.readFile(absPath, "utf-8");
        return { text: async () => text };
      }
    };
  } else {
    perf = performance;
    fetchFunc = fetch;
  }
}

// -------------------- Sparse Engine (Optimized) --------------------
class SparseEngine {
  constructor() {
    this.docs = [];
    this.idf = new Map();
    this.avgLen = 0;
    this.k1 = 1.2;
    this.b = 0.75;
    this.docFreqs = []; // Precomputed term frequencies per document
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

    docs.forEach((d, i) => {
      const tokens = this.tokenize(d);
      total += tokens.length;

      const freq = new Map();
      tokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
      this.docFreqs[i] = freq;

      new Set(tokens).forEach(t => df.set(t, (df.get(t) || 0) + 1));
    });

    this.avgLen = total / docs.length;

    for (const [t, c] of df) {
      this.idf.set(t, Math.log((docs.length - c + 0.5) / (c + 0.5) + 1));
    }
  }

  score(query, docIndex) {
    const tokens = this.docFreqs[docIndex];
    let score = 0;
    for (const q of query) {
      const tf = tokens.get(q) || 0;
      if (!tf) continue;
      const idf = this.idf.get(q) || 0;
      const lenFactor = Array.from(tokens.values()).reduce((a, b) => a + b, 0) / (this.avgLen || 1);
      score += idf * ((tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * lenFactor)));
    }
    return score;
  }

  search(query) {
    const tokens = query.map(q => q.toLowerCase());
    const results = [];
    for (let i = 0; i < this.docs.length; i++) {
      const s = this.score(tokens, i);
      if (s > 0) results.push({ doc: this.docs[i], score: s });
    }
    return results;
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

// -------------------- Cost & CO₂ Comparison --------------------
function calculateStats(queryVolumePerMonth) {
  const systems = [
    { name: "PLEX Sparse", cost: 7500, power: 50 },
    { name: "Modern Dense", cost: 220_000, power: 2_500 },
    { name: "NVIDIA-scale", cost: 2_200_000_000, power: 2_000_000 }
  ];

  const hoursPerMonth = 24 * 30;
  const co2PerKWh = 0.4;

  return systems.map(sys => {
    const monthlyCost = sys.cost * (queryVolumePerMonth / 1_000_000);
    const yearlyCost = monthlyCost * 12;
    const kWh = (sys.power * hoursPerMonth) / 1000;
    const co2 = kWh * co2PerKWh;
    const queriesPerDollar = queryVolumePerMonth / monthlyCost;
    const queriesPerKWh = queryVolumePerMonth / kWh;

    const yearlySavingsSparseVsDense = (systems[1].cost - systems[0].cost) * (queryVolumePerMonth / 1_000_000) * 12;
    const yearlySavingsSparseVsNvidia = (systems[2].cost - systems[0].cost) * (queryVolumePerMonth / 1_000_000) * 12;

    return {
      ...sys,
      totalCost: monthlyCost,
      yearlyCost,
      co2,
      queriesPerDollar,
      queriesPerKWh,
      yearlySavingsSparseVsDense,
      yearlySavingsSparseVsNvidia
    };
  });
}

// -------------------- CSV Loader --------------------
async function loadCSV(urlOrPath) {
  const res = await fetchFunc(urlOrPath);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = parts[i]?.replace(/^"|"$/g, "")?.trim() || "";
    });
    return { _id: obj.ZIP, zip: obj.ZIP, city: obj.CITY, state: obj.STATE };
  });
}

// -------------------- Demo Runner --------------------
async function runDemo() {
  await setupEnvironment();

  console.log("\nPLEX Runtime™ — Sparse vs Dense (Optimized + Detailed Stats)\n");

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
    const sparseHits = engine.search(tokens);
    const s1 = perf.now();
    denseSimulation(tokens, data); // Simulated

    console.log("────────────────────────────────────────");
    console.log(`QUERY: "${q}"\n`);

    console.log("PLEX Sparse (Exact):");
    console.log(`  Matches: ${sparseHits.length}`);
    console.log(`  Time: ${(s1 - s0).toFixed(2)} ms`);
    console.log("  Infrastructure: CPU only\n");

    console.log("Modern Dense Model (Approximate):");
    console.log("  Matches: Always returns something");
    console.log("  Time: N/A (simulated)");
    console.log("  Infrastructure: GPU + vector DB\n");
  }

  console.log("────────────────────────────────────────");
  console.log("DETAILED DATA CENTER COST & ENVIRONMENTAL COMPARISON\n");

  const stats = calculateStats(queryVolume);
  stats.forEach(s => {
    console.log(`${s.name}:`);
    console.log(`  Monthly Cost: $${s.totalCost.toLocaleString()}`);
    console.log(`  Yearly Cost: $${s.yearlyCost.toLocaleString()}`);
    console.log(`  CO₂: ${s.co2.toLocaleString()} kg/month`);
    console.log(`  Power: ~${(s.power / 1000).toLocaleString()} kW`);
    console.log(`  Queries per $: ${s.queriesPerDollar.toLocaleString()}`);
    console.log(`  Queries per kWh: ${s.queriesPerKWh.toLocaleString()}`);
    console.log(`  Yearly Savings vs Modern Dense: $${s.yearlySavingsSparseVsDense.toLocaleString()}`);
    console.log(`  Yearly Savings vs NVIDIA-scale: $${s.yearlySavingsSparseVsNvidia.toLocaleString()}\n`);
  });

  console.log("────────────────────────────────────────");
  console.log("COMPARISON PERCENTAGES:");
  const sparse = stats[0], dense = stats[1], nvidia = stats[2];
  console.log(`  Sparse vs Dense cost savings: ${(((dense.totalCost - sparse.totalCost)/dense.totalCost)*100).toFixed(1)}% cheaper`);
  console.log(`  Sparse vs NVIDIA-scale cost savings: ${(((nvidia.totalCost - sparse.totalCost)/nvidia.totalCost)*100).toFixed(1)}% cheaper`);
  console.log("────────────────────────────────────────");
}

// -------------------- Launch --------------------
runDemo().catch(err => {
  console.error(err);
  if (isNode) process.exit(1);
});
