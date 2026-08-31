#!/usr/bin/env node
/**
 * Push a local data.json into Supabase — the one-time migration off the
 * Railway volume, and the way to restore a backup later.
 *
 *   npm run seed                 # pushes ./data.json
 *   npm run seed -- backup.json  # pushes another file
 *   npm run seed -- --force      # overwrite a row that already has images
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const TABLE  = 'portfolio_state';
const ROW_ID = 1;

const args  = process.argv.slice(2);
const force = args.includes('--force');
const file  = args.find(a => !a.startsWith('--')) || path.join(__dirname, '..', 'data.json');

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.');
  }

  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) fail(`No such file: ${filePath}`);

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(`${filePath} is not valid JSON: ${e.message}`);
  }

  for (const key of ['chapters', 'images', 'settings', 'admin']) {
    if (payload[key] === undefined) fail(`${filePath} is missing the "${key}" field.`);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: readErr } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (readErr) {
    fail(`Could not read ${TABLE}: ${readErr.message}\n    Did you run supabase/schema.sql in the SQL editor?`);
  }

  const liveImages = existing?.data?.images?.length ?? 0;
  if (liveImages > 0 && !force) {
    fail(
      `Supabase already holds ${liveImages} image(s), last updated ${existing.updated_at}.\n` +
      `    Re-run with --force to overwrite them.`,
    );
  }

  const { error: writeErr } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data: payload, updated_at: new Date().toISOString() });

  if (writeErr) fail(`Write failed: ${writeErr.message}`);

  console.log(`\n  ✓ Pushed ${path.basename(filePath)} to Supabase`);
  console.log(`    chapters: ${payload.chapters.length}`);
  console.log(`    images:   ${payload.images.length}`);
  console.log(`    admin:    ${payload.admin.username}\n`);
}

main().catch(err => fail(err.message));
