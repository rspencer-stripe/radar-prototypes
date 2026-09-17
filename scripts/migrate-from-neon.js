// One-time migration: pull all rows out of the old Neon Postgres database and
// write them into the new Vercel Blob JSON store. Run manually with:
//   node scripts/migrate-from-neon.js
// Requires POSTGRES_URL (Neon) and BLOB_READ_WRITE_TOKEN in the environment —
// `vercel env pull .env.local` first if running locally.
const path = require('path');
const fs = require('fs');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, '');
    }
  }
}

async function uploadDataUrlIfNeeded(dataUrl, put) {
  const match = /^data:(image\/[a-z]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) return dataUrl || '';
  const crypto = require('crypto');
  const [, contentType, base64] = match;
  const ext = contentType.split('/')[1] || 'jpg';
  const buffer = Buffer.from(base64, 'base64');
  const { url } = await put(`images/${crypto.randomUUID()}.${ext}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });
  return url;
}

async function main() {
  loadEnvLocal();
  const { sql } = require('@vercel/postgres');
  const { put } = require('@vercel/blob');
  const { readStore, writeStore } = require('../lib/store');

  console.log('Reading prototypes from Neon...');
  const { rows: protoRows } = await sql`SELECT * FROM prototypes ORDER BY pinned DESC, sort_order ASC`;
  console.log(`Found ${protoRows.length} prototypes.`);

  console.log('Reading settings from Neon...');
  const { rows: settingsRows } = await sql`SELECT authors, tags, author_photos FROM app_settings WHERE id = 1`;
  const settingsRow = settingsRows[0] || {};

  console.log('Re-uploading embedded images as blobs...');
  const prototypes = [];
  for (const row of protoRows) {
    const imageUrl = await uploadDataUrlIfNeeded(row.image_url, put);
    prototypes.push({
      id: row.id,
      name: row.name,
      author: row.author,
      imageUrl,
      link: row.link || '',
      description: row.description || '',
      pinned: !!row.pinned,
      type: row.type || 'Prototype',
      sortOrder: Number(row.sort_order) || 0,
      createdAt: row.created_at,
    });
  }

  const authorPhotosRaw = settingsRow.author_photos || {};
  const authorPhotos = {};
  for (const [author, dataUrl] of Object.entries(authorPhotosRaw)) {
    authorPhotos[author] = await uploadDataUrlIfNeeded(dataUrl, put);
  }

  const nextId = prototypes.reduce((max, p) => Math.max(max, p.id), 0) + 1;

  const store = await readStore();
  store.prototypes = prototypes;
  store.nextId = Math.max(store.nextId, nextId);
  store.authors = settingsRow.authors || store.authors;
  store.tags = settingsRow.tags || store.tags;
  store.authorPhotos = authorPhotos;

  console.log('Writing new store to Blob...');
  await writeStore(store);

  console.log(`Done. Migrated ${prototypes.length} prototypes and ${Object.keys(authorPhotos).length} author photos.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
