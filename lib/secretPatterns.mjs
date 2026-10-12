/**
 * Secret-shape patterns — single source of truth.
 *
 * Used by TWO consumers that must never drift apart:
 *   1. scripts/scan-dist-secrets.mjs — post-build scanner (node), and
 *   2. services/modelCallLog.ts / services/queryCache.ts — the prompt scrubber
 *      that runs BEFORE any prompt/query text is persisted (model_call_log,
 *      query_cache). Logging must not become the leak path the scanner exists
 *      to prevent.
 *
 * Pure ESM with zero node: imports so it bundles cleanly into the client.
 * The regex sources are safe to ship in dist/ — none of them matches its own
 * literal source text (verified: `npm run build` runs the scanner over dist).
 */

/** @typedef {[string, RegExp]} SecretRule */

/** @type {SecretRule[]} */
export const SECRET_RULES = [
  ['CHUTES_KEY (cpk_)', /cpk_[A-Za-z0-9_]{8,}/],
  ['TAVILY_KEY (tvly-)', /tvly-[A-Za-z0-9]{8,}/],
  ['OPENAI_STYLE_KEY (sk-)', /\bsk-[A-Za-z0-9_-]{16,}/],
  ['SERVICE_KEY (sk_)', /\bsk_[A-Za-z0-9_]{16,}/],
  ['AWS_ACCESS_KEY (AKIA)', /AKIA[0-9A-Z]{16}/],
  ['GITHUB_TOKEN (ghp_/PAT)', /(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/],
  ['SLACK_TOKEN (xox)', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['GOOGLE_API_KEY (AIza)', /AIza[0-9A-Za-z_-]{30,}/],
  ['PRIVATE_KEY_BLOCK', /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY/],
  ['VITE_SECRET_NAME_IN_BUNDLE', /VITE_(?:CHUTES|TAVILY|BRAVE)[A-Z0-9_]*/],
  ['API_KEY_LITERAL', /(?:api[_-]?key|apikey|secret)["']?\s*[:=]\s*["'][A-Za-z0-9_.-]{24,}["']/i],
];

export const REDACTED = '[REDACTED]';

/** Max persisted prompt/query length (spec §1c). */
export const PROMPT_MAX_CHARS = 2000;

/**
 * Replace every secret-shape match with `[REDACTED]`.
 * @param {string} text
 * @returns {string}
 */
export function scrubSecrets(text) {
  if (!text) return text;
  let out = text;
  for (const [, pattern] of SECRET_RULES) {
    out = out.replace(new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g'), REDACTED);
  }
  return out;
}

/**
 * True when the text still contains a secret shape (used as a refusal check —
 * e.g. never cache a response that looks like it leaked a key).
 * @param {string} text
 * @returns {boolean}
 */
export function containsSecretShape(text) {
  if (!text) return false;
  return SECRET_RULES.some(([, pattern]) => pattern.test(text));
}

/**
 * Scrub, truncate to PROMPT_MAX_CHARS, then scrub again (a truncation boundary
 * can otherwise leave a partial-but-still-shaped fragment). Safe for storage.
 * @param {string} text
 * @returns {string}
 */
export function sanitizePersistedText(text) {
  const scrubbed = scrubSecrets(String(text ?? ''));
  const truncated = scrubbed.length > PROMPT_MAX_CHARS ? scrubbed.slice(0, PROMPT_MAX_CHARS) : scrubbed;
  return scrubSecrets(truncated);
}
