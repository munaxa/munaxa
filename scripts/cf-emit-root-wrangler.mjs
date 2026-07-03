// Cloudflare Workers Builds runs the projects' deploy command (`npx wrangler versions
// upload`) from the monorepo ROOT (the project "Root directory" is `/`), but each app's
// `wrangler.jsonc` and its OpenNext build output live in the app's own folder. With no
// config at the root, wrangler fails with "Missing entry-point to Worker script or to
// assets directory".
//
// This script — run at the end of each app's `cf:build`, so `cwd` is the app folder —
// writes a root-level `wrangler.jsonc` that is the app's own config with the `main` and
// `assets.directory` paths rewritten to include the app folder. The root deploy then
// resolves the worker + assets correctly. Each Cloudflare project builds in its own
// isolated container, so the emitted root config never collides between apps.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const appDir = process.cwd();
const app = basename(appDir);
const src = readFileSync(join(appDir, 'wrangler.jsonc'), 'utf8');

const rewritten = src
  .replace(/("main":\s*")\.open-next\/worker\.js"/, `$1${app}/.open-next/worker.js"`)
  .replace(/("directory":\s*")\.open-next\/assets"/, `$1${app}/.open-next/assets"`);

if (rewritten === src) {
  throw new Error(
    `cf-emit-root-wrangler: expected main/assets paths not found in ${app}/wrangler.jsonc`,
  );
}

writeFileSync(join(appDir, '..', 'wrangler.jsonc'), rewritten);
// eslint-disable-next-line no-console
console.log(`cf-emit-root-wrangler: wrote root wrangler.jsonc for ${app}`);
