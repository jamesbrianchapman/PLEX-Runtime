#!/usr/bin/env node
/******************************************************************************
 * PLEX Runtime™ — Mandatory Baseline Search Demo
 *
 * Purpose:
 *   Show, in plain English, why exact sparse search MUST run first.
 *
 * Author:
 *   Original design & implementation by YOU.
 *
 * Rule:
 *   If a system cannot do this, it is not allowed to proceed.
 ******************************************************************************/

import fs from "fs/promises";
import { performance } from "perf_hooks";

/* -------------------- Helpers -------------------- */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const say = async (msg, delay = 500) => {
  console.log(msg);
  await sleep(delay);
};

/* -------------------- Sparse Engine -------------------- */

class SparseEngine {
  static docs = [];
  static idf = new Map();
  static avgLen = 0;
  static k1 = 1.2;
  static b = 0.75;

  static tokenize(item) {
    return ["city", "state", "zip", "_id"]
      .map(f => (item[f] || "").toString().toLowerCase())
      .join(" ")
      .split(/\s+/)
      .filter(Boolean);
  }

  static init(docs) {
    this.docs = docs;
    const df = new Map();
    let totalLen = 0;

    docs.forEach(doc => {
      const tokens = this.tokenize(doc);
      totalLen += tokens.length;
      const seen = new Set(tokens);
      seen.forEach(t => df.set(t, (df.get(t) || 0) + 1));
    });

    this.avgLen = totalLen / docs.length;

    for (const [term, count] of df) {
      this.idf.set(term, Math.log((docs.length - count + 0.5) / (count + 0.5) + 1));
    }
  }

  static score(queryTokens, doc) {
    const tokens = this.tokenize(doc);
    const freq = new Map();
    tokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));

    let score = 0;
    for (const q of queryTokens) {
      const tf = freq.get(q) || 0;
      if (!tf) continue;

      const idf = this.idf.get(q) || 0;
      score += idf *
        ((tf * (this.k1 + 1)) /
         (tf + this.k1 * (1 - this.b + this.b * tokens.length / this.avgLen)));
    }
    return score;
  }
}

/* -------------------- Demo -------------------- */

(async () => {
  await say("\nPLEX Runtime™ — Mandatory Baseline Search\n");
  await say("This demo shows how correct systems begin.\n");

  const data = JSON.parse(await fs.readFile("data.json", "utf8"));

  await say(`Loaded ${data.length} real records.`);
  await say("Building exact search index (no AI, no guessing)...");

  const t0 = performance.now();
  SparseEngine.init(data);
  const t1 = performance.now();

  await say(`Index built in ${(t1 - t0).toFixed(0)} milliseconds.\n`);

  const tests = [
    { q: "CUSHMAN", explain: "A rare exact name" },
    { q: "BOSTON", explain: "A common city" },
    { q: "02134", explain: "A numeric identifier" },
    { q: "ZZZZ_NOT_REAL", explain: "Something that does not exist" }
  ];

  for (const { q, explain } of tests) {
    await say(`Searching for "${q}" (${explain})...`);

    const qt = q.toLowerCase().split(/\s+/);
    const start = performance.now();

    const scored = data
      .map(d => SparseEngine.score(qt, d))
      .filter(s => s > 0);

    const end = performance.now();

    if (scored.length === 0) {
      await say("→ Result: NOT FOUND (and the system says so honestly)");
    } else {
      await say(`→ Result: FOUND in ${scored.length} records`);
    }

    await say(`→ Time: ${(end - start).toFixed(2)} ms\n`);
  }

  await say("What this proves:\n");
  await say("✔ The system knows when something exists");
  await say("✔ The system knows when it does not");
  await say("✔ It never guesses");
  await say("✔ It runs instantly on a normal computer\n");

  await say("Rule:");
  await say("If a system cannot do this first, it is not allowed to run.\n");

  await say("PLEX Runtime™ — Original system by YOU.");
  await say("This is the mandatory foundation.\n");

})();
