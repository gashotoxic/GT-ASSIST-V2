#!/usr/bin/env node
/* global process, console */
/**
 * Post-build secret scan for the client bundle.
 *
 * Scans every text asset in the build output (default: dist/) for API key
 * shapes and fails with exit 1 if any hit is found. Wired into `npm run build`
 * so a leak can never ship again.
 *
 * Usage:
 *   node scripts/scan-dist-secrets.mjs [distDir]
 *
 * The scan also fails when it finds ZERO files to scan — a silent no-op pass is
 * not evidence of a clean bundle.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const distDir = process.argv[2] || 'dist';
const TEXT_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.css', '.html', '.htm', '.json', '.txt',
  '.svg', '.map', '.webmanifest', '.xml',
]);

// Each rule: [name, regex]. Values are NEVER printed — only the rule name and
// the file/line of the hit (redacted excerpt) so build logs don't leak the key.
const RULES = [
  ['CHUTES_KEY (cpk_)', /cpk_[A-Za-z0-9_]{8,}/],
  ['TAVILY_KEY (tvly-)', /tvly-[A-Za-z0-9]{8,}/],
  ['OPENAI_STYLE_KEY (sk-)', /\bsk-[A-Za-z0-9_-]{16,}/],
  ['SERVICE_KEY (sk_)', /\bsk_[A-Za-z0-9_]{16,}/],
  ['AWS_ACCESS_KEY (AKIA)', /AKIA[0-9A-Z]{16}/],
  ['GITHUB_TOKEN (ghp_/PAT)', /(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/],
  ['SLACK_TOKEN (xox)', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['GOOGLE_API_KEY (AIza)', /AIza[0-9A-Za-z_-]{30,}/],
  ['PRIVATE_KEY_BLOCK', /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY/],
  // Tripwire: a VITE_-prefixed secret NAME surviving into the bundle means a
  // dynamic import.meta.env access re-inlined it. Names of publishable keys
  // (CLERK, SUPABASE, PAYSTACK) are intentionally not covered.
  ['VITE_SECRET_NAME_IN_BUNDLE', /VITE_(?:CHUTES|TAVILY|BRAVE)[A-Z0-9_]*/],
  // Heuristic "api key shape": a *key/secret* property assigned a long literal.
  ['API_KEY_LITERAL', /(?:api[_-]?key|apikey|secret)["']?\s*[:=]\s*["'][A-Za-z0-9_.-]{24,}["']/i],
];

const redact = (line) => line.length > 40 ? `${line.slice(0, 40)}…` : line;

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
};

let scanned = 0;
const hits = [];

let files;
try {
  files = walk(distDir);
} catch {
  console.error(`[scan-dist-secrets] FAIL: cannot read build output at "${distDir}" — run the build first.`);
  process.exit(1);
}

for (const file of files) {
  if (!TEXT_EXTENSIONS.has(extname(file).toLowerCase())) continue;
  scanned += 1;
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    for (const [name, pattern] of RULES) {
      const match = lines[i].match(pattern);
      if (match) {
        const at = match.index ?? 0;
        const masked = lines[i].slice(0, at) + '<redacted>' + lines[i].slice(at + match[0].length);
        hits.push({ file: relative(process.cwd(), file), line: i + 1, name, excerpt: redact(masked.trim()) });
      }
    }
  }
}

if (scanned === 0) {
  console.error(`[scan-dist-secrets] FAIL: no text assets found under "${distDir}" — refusing to report a pass from an empty scan.`);
  process.exit(1);
}

if (hits.length > 0) {
  console.error(`[scan-dist-secrets] FAIL: ${hits.length} potential secret(s) in the built assets:`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line} [${hit.name}] line: ${hit.excerpt}`);
  }
  console.error('[scan-dist-secrets] Values are redacted above. Remove the secret from the client bundle (move the call server-side) before deploying.');
  process.exit(1);
}

console.log(`[scan-dist-secrets] PASS: ${scanned} asset(s) scanned in "${distDir}" — no key shapes found.`);
