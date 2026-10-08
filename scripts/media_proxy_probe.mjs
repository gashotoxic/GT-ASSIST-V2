#!/usr/bin/env node
/* global process, console, URL, fetch, Buffer, TextDecoder */
/**
 * Live media-payload probe for the /api/chutes proxy (card t_ad34ccfb).
 *
 * Exercises the paths that historically could NOT survive the tunnel:
 *   - TTS (audio blob response)
 *   - image edit (base64 image in, image blob out)
 *   - video gen (LTX 2.5 minimal — the long-running path vs maxDuration)
 *   - lip sync (base64 VIDEO + audio in JSON body — the ~4.5MB body-cap risk)
 * plus the free boundary checks: auth 401s, origin 403, capability probe,
 * BYOK passthrough and the 413 body cap.
 *
 * Fixtures are generated at runtime (tiny PNG via a minimal PNG encoder, WAV
 * via PCM synthesis); the lip-sync test REUSES real outputs — the TTS speech
 * becomes its audio input and the generated video its video input — so every
 * payload is real media, nothing synthetic beyond the one image-edit source.
 *
 * Usage:
 *   CLERK_TOKEN=<session jwt> node scripts/media_proxy_probe.mjs <base-url> \
 *     [--bypass <vercel-protection-bypass>] [--out <dir>] [--skip-media]
 *
 * Exit code 0 = every executed check matched expectations; 1 otherwise.
 * A check that cannot run (e.g. lip sync blocked because video gen failed)
 * is reported as "blocked" with a reason and does NOT fail the run.
 */
import { createDeflateRaw, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const baseUrl = (args.find((a) => !a.startsWith('--')) || '').replace(/\/+$/, '');
const opt = (name) => {
  const i = args.indexOf('--' + name);
  return i === -1 ? undefined : args[i + 1];
};
const bypass = opt('bypass');
const outDir = opt('out') || join(tmpdir(), 'media-probe-' + Date.now());
const skipMedia = args.includes('--skip-media');
const token = process.env.CLERK_TOKEN || '';

if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  console.error('usage: CLERK_TOKEN=<jwt> node scripts/media_proxy_probe.mjs <base-url> [--bypass <t>] [--out <dir>] [--skip-media]');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const results = [];
const record = (name, expected, actual, extra = {}) => {
  const ok = expected === actual;
  results.push({ name, expected, actual, ok, ...extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — expected ${expected}, got ${actual}` + (extra.note ? ` (${extra.note})` : ''));
  return ok;
};

const apiFetch = async (path, { method = 'GET', body, auth = true, origin, extraHeaders = {} } = {}) => {
  // extraHeaders must win over the default auth header — per-test overrides
  // (e.g. a deliberate garbage token) are the point of the test.
  const headers = { ...(auth && token ? { authorization: 'Bearer ' + token } : {}), ...extraHeaders };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (origin) headers['origin'] = origin;
  if (bypass) headers['x-vercel-protection-bypass'] = bypass;
  // Vercel share-link auth works via cookie (mint with get_access_to_vercel_url
  // and pass the jar via VERCEL_COOKIE, e.g. "vercel_jwt=...").
  if (process.env.VERCEL_COOKIE) headers['cookie'] = process.env.VERCEL_COOKIE;
  const started = Date.now();
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  return { res, durationMs: Date.now() - started };
};

// ---- Fixture generators ----------------------------------------------------

/** Minimal PNG encoder (RGB, no interlace) — enough for a real image payload. */
const makePng = (width, height, rgbFn) => {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE((crc32(body) >>> 0) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = rgbFn(x, y);
      raw[rowStart + 1 + x * 3] = r;
      raw[rowStart + 1 + x * 3 + 1] = g;
      raw[rowStart + 1 + x * 3 + 2] = b;
    }
  }
  // deflateRaw + zlib header/adler via a manual wrapper: use deflateSync-style
  // framing through createDeflateRaw is async; simplest is a stored-block zlib.
  return new Promise((resolve) => {
    const chunks = [];
    const d = createDeflateRaw();
    d.on('data', (c) => chunks.push(c));
    d.on('end', () => {
      const adler = (() => {
        let a = 1, b = 0;
        for (const byte of raw) {
          a = (a + byte) % 65521;
          b = (b + a) % 65521;
        }
        return ((b << 16) | a) >>> 0;
      })();
      const zlibHeader = Buffer.from([0x78, 0x01]);
      const adlerBuf = Buffer.alloc(4);
      adlerBuf.writeUInt32BE(adler);
      const idat = Buffer.concat([zlibHeader, Buffer.concat(chunks), adlerBuf]);
      resolve(Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]));
    });
    d.end(raw);
  });
};

/** 22050Hz 16-bit mono PCM WAV — 1.2s of a quiet 440Hz tone (fallback audio). */
const makeWav = () => {
  const rate = 22050;
  const seconds = 1.2;
  const n = Math.floor(rate * seconds);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i += 1) {
    data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

// ---- Free boundary checks --------------------------------------------------

let allOk = true;
try {
  {
    const { res } = await apiFetch('/api/search', { auth: false });
    const body = await res.json();
    record('probe GET /api/search unauthenticated', 200, res.status, { body });
    record('probe shape (booleans only)', 'ok',
      typeof body.tavily === 'boolean' && typeof body.brave === 'boolean'
        ? 'ok' : `${typeof body.tavily},${typeof body.brave}`);
  }
  {
    const { res } = await apiFetch('/api/chutes', { auth: false });
    record('GET /api/chutes -> 405', 405, res.status);
  }
  {
    const { res } = await apiFetch('/api/chutes', {
      method: 'POST',
      auth: false,
      body: { targetUrl: 'https://llm.chutes.ai/v1/chat/completions', body: {} },
    });
    record('POST /api/chutes without token -> 401', 401, res.status);
    record('401 carries X-Proxy-Error: 1', '1', res.headers.get('x-proxy-error'));
  }
  {
    const { res } = await apiFetch('/api/chutes', {
      method: 'POST',
      extraHeaders: { authorization: 'Bearer not.a.jwt' },
      body: { targetUrl: 'https://llm.chutes.ai/v1/chat/completions', body: {} },
    });
    record('POST /api/chutes with garbage token -> 401', 401, res.status);
  }
  {
    const { res } = await apiFetch('/api/chutes', {
      method: 'POST',
      origin: 'https://evil.example.com',
      body: { targetUrl: 'https://llm.chutes.ai/v1/chat/completions', body: {} },
    });
    record('evil Origin -> 403', 403, res.status);
  }
  {
    // BYOK passthrough: an invalid user key must be forwarded upstream and the
    // upstream's own error must pass through untouched (free — Tavily rejects).
    const { res, durationMs } = await apiFetch('/api/search', {
      method: 'POST',
      body: { provider: 'tavily', query: 'probe', userKey: 'invalid-probe-key-byok' },
    });
    const text = await res.text();
    // The upstream's own rejection status passes through untouched — and the
    // response must NOT be marked X-Proxy-Error (that would mean the proxy
    // answered instead of forwarding the userKey).
    record('BYOK userKey forwarded (upstream rejects it)', true,
      res.status >= 400 && res.headers.get('x-proxy-error') === null,
      { note: `upstream status ${res.status} in ${durationMs}ms: ${text.slice(0, 120)}` });
  }
  {
    const fat = { targetUrl: 'https://llm.chutes.ai/x', body: { blob: 'x'.repeat(4_600_000) } };
    const { res } = await apiFetch('/api/chutes', { method: 'POST', body: typeof fat === 'string' ? fat : JSON.stringify(fat) });
    record('oversized body -> 413', 413, res.status, { note: 'body cap tripwire' });
  }
} catch (e) {
  // A crashed boundary check must FAIL the run — never let an aborted probe
  // report success (a checker that cannot fail verifies nothing).
  results.push({ name: 'boundary checks aborted', expected: 'complete', actual: 'exception: ' + e.message, ok: false });
  console.error('boundary checks aborted:', e);
}

// ---- Real media payloads ---------------------------------------------------

let ttsAudioB64 = null;
let videoB64 = null;

if (!skipMedia && token) {
  // Pre-flight: an expired session token must NOT turn every media test into a
  // misleading 401 — report one explicit 'blocked' instead.
  const preflight = await apiFetch('/api/chutes', {
    method: 'POST',
    body: { targetUrl: 'https://nope.invalid/x', body: {} },
  });
  if (preflight.res.status === 401) {
    results.push({ name: 'media payload tests', expected: 'executed', actual: 'blocked', ok: null, note: 'blocked: session token rejected (expired?) — re-mint CLERK_TOKEN' });
    console.log('BLOCKED media checks — CLERK_TOKEN rejected (expired?). Re-mint and re-run.');
  } else {
  // 1) TTS — real speech in, audio blob out (also feeds lip sync below).
  try {
    const body = { text: 'Hello. This is the GashoTech proxy media validation run.', speed: 1, voice: 'am_adam' };
    const { res, durationMs } = await apiFetch('/api/chutes', {
      method: 'POST',
      body: { targetUrl: 'https://vonkaiser-audiodojo.chutes.ai/speak', body },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    record('TTS speak -> audio blob', 200, res.status, {
      note: `${buf.length} bytes, ${res.headers.get('content-type')}, ${durationMs}ms`,
    });
    if (res.status === 200 && buf.length > 1000) {
      ttsAudioB64 = buf.toString('base64');
      writeFileSync(join(outDir, 'tts-output' + (res.headers.get('content-type')?.includes('wav') ? '.wav' : '.bin')), buf);
    }
  } catch (e) {
    record('TTS speak -> audio blob', 200, 'exception: ' + e.message);
  }

  // 2) Image edit — real PNG in, image blob out.
  try {
    const png = await makePng(256, 256, (x, y) => (x + y) % 64 < 32 ? [220, 60, 60] : [60, 90, 220]);
    const body = {
      seed: null, width: 256, height: 256,
      prompt: 'turn the sky green',
      image_b64s: [png.toString('base64')],
      true_cfg_scale: 4, negative_prompt: '', num_inference_steps: 20,
    };
    const requestBytes = JSON.stringify({ targetUrl: 'x', body }).length;
    const { res, durationMs } = await apiFetch('/api/chutes', {
      method: 'POST',
      body: { targetUrl: 'https://vonkaiser-qwen-image-edit-2511.chutes.ai/generate', body },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    record('image edit (base64 png) -> image blob', 200, res.status, {
      note: `req ~${requestBytes} bytes, resp ${buf.length} bytes, ${res.headers.get('content-type')}, ${durationMs}ms`,
    });
    if (res.status === 200 && buf.length > 1000) writeFileSync(join(outDir, 'image-edit-output.bin'), buf);
  } catch (e) {
    record('image edit (base64 png) -> image blob', 200, 'exception: ' + e.message);
  }

  // 3) Video gen — LTX 2.5 minimal (the long-running path vs maxDuration 300).
  try {
    const body = {
      prompt: 'a red ball bouncing on a wooden floor',
      width: 448, height: 256, fps: 24,
      use_random_seed: true, enhance_prompt: false, generate_audio: false,
      auto_duration: false, video_format: 'mp4', return_json: false,
      duration: 2,
    };
    const requestBytes = JSON.stringify({ targetUrl: 'x', body }).length;
    const { res, durationMs } = await apiFetch('/api/chutes', {
      method: 'POST',
      body: { targetUrl: 'https://vonkaiser-ltx-25-video.chutes.ai/generate', body },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    record('video gen LTX 2.5 (2s) -> video blob', 200, res.status, {
      note: `req ~${requestBytes} bytes, resp ${buf.length} bytes, ${res.headers.get('content-type')}, ${durationMs}ms (vs maxDuration 300s)`,
    });
    if (res.status === 200 && buf.length > 10000) {
      videoB64 = buf.toString('base64');
      writeFileSync(join(outDir, 'video-gen-output.mp4'), buf);
    }
  } catch (e) {
    record('video gen LTX 2.5 (2s) -> video blob', 200, 'exception: ' + e.message);
  }

  // 4) Lip sync — base64 VIDEO + audio in the JSON body (the body-cap risk).
  //    Uses the real outputs from tests 1 and 3 as its inputs.
  if (ttsAudioB64 && videoB64) {
    try {
      const body = {
        fps: 25, batch_size: 8,
        audio_input: ttsAudioB64,
        video_input: videoB64,
        extra_margin: 10, parsing_mode: 'jaw',
        left_cheek_width: 90, right_cheek_width: 90,
      };
      const requestBytes = JSON.stringify({ targetUrl: 'x', body }).length;
      const { res, durationMs } = await apiFetch('/api/chutes', {
        method: 'POST',
        body: { targetUrl: 'https://chutes-musetalk.chutes.ai/generate', body },
      });
      const buf = Buffer.from(await res.arrayBuffer());
      record('lip sync (base64 video+audio) -> video blob', 200, res.status, {
        note: `req ~${Math.round(requestBytes / 1024)}KiB (cap 4500KiB), resp ${buf.length} bytes, ${res.headers.get('content-type')}, ${durationMs}ms`,
      });
      if (res.status === 200 && buf.length > 10000) writeFileSync(join(outDir, 'lipsync-output.mp4'), buf);
    } catch (e) {
      record('lip sync (base64 video+audio) -> video blob', 200, 'exception: ' + e.message);
    }
  } else {
    results.push({ name: 'lip sync (base64 video+audio) -> video blob', expected: 200, actual: 'blocked', ok: null, note: 'blocked: needs both TTS audio and generated video outputs' });
    console.log('BLOCKED lip sync (base64 video+audio) — prerequisites missing (see TTS/video results)');
  }
  }
} else if (!skipMedia) {
  console.log('SKIP media checks — CLERK_TOKEN not set (boundary checks only)');
} else {
  console.log('SKIP media checks — --skip-media');
}

// ---- Report ----------------------------------------------------------------

const failed = results.filter((r) => r.ok === false);
const passed = results.filter((r) => r.ok === true);
console.log('\n=== media_proxy_probe report ===');
console.log(JSON.stringify({ baseUrl, outDir, passed: passed.length, failed: failed.length, results }, null, 2));
allOk = failed.length === 0;
process.exit(allOk ? 0 : 1);
