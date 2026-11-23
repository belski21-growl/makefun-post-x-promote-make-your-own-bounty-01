// Entry program for post-x-promote-make-your-own-bounty-01.
//
// The entry itself is a single post on X: a quote of make.fun's
// make-your-own-bounty post, with a photo of its own attached. This program
// does not touch X at all. All it does is hand the house the post's address:
// it reads POST.json out of the repository folder and writes an exact copy
// of those bytes into the output folder, where the gate reads it.
//
// It runs on Node 22+ with the standard library only: no network, no clock,
// no files outside the two folders below. Both folders come from the
// environment so the grader can aim them at /bot and /output, while a local
// run aims them at the repository and a scratch folder:
//
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
//
// On success it prints nothing and exits 0. On any problem it prints one
// plain error line to stderr and exits 1, so a failed copy is loud instead
// of silently handing the gate a stale file.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const sourcePath = join(repoDir, 'POST.json');
const targetPath = join(outDir, 'POST.json');

let raw: Buffer;
try {
  raw = readFileSync(sourcePath);
} catch (err) {
  console.error(`could not read ${sourcePath}: ${(err as Error).message}`);
  process.exit(1);
}

// The file must be a JSON object naming one post. Parse it here so a
// malformed POST.json fails the run instead of reaching the gate; the bytes
// written out below are still the untouched originals, so the copy stays
// byte-for-byte identical.
let parsed: unknown;
try {
  parsed = JSON.parse(raw.toString('utf8'));
} catch (err) {
  console.error(`POST.json is not valid JSON: ${(err as Error).message}`);
  process.exit(1);
}

if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
  console.error('POST.json must be a JSON object like {"url": "https://x.com/<handle>/status/<id>"}');
  process.exit(1);
}

if (typeof (parsed as Record<string, unknown>).url !== 'string') {
  console.error('POST.json must carry a "url" string naming the post on X');
  process.exit(1);
}

const postUrl = (parsed as Record<string, unknown>).url as string;

// The gate only reads POST.json up to 16384 bytes, so refuse anything
// bigger here instead of letting a too-large file through to a confusing
// gate failure.
if (raw.length > 16384) {
  console.error(`POST.json is ${raw.length} bytes, over the gate limit of 16384 bytes`);
  process.exit(1);
}

// The address must look like a real post address: an x.com (or twitter.com)
// link whose path ends in /status/<digits>. The placeholder that ships with
// the entry fails this check on purpose, so an unedited POST.json can never
// pass as a real post.
const postAddress = /^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/[^/]+\/status\/\d+\/?([?#].*)?$/.test(postUrl);
if (!postAddress) {
  console.error(
    `POST.json "url" is not an X post address (expected https://x.com/<handle>/status/<id>): ${postUrl}`,
  );
  process.exit(1);
}

try {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(targetPath, raw);
} catch (err) {
  console.error(`could not write ${targetPath}: ${(err as Error).message}`);
  process.exit(1);
}
