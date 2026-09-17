const { sql } = require('@vercel/postgres');

let ready = false;
let settingsReady = false;

const DEFAULT_AUTHORS = ['Anne', 'Shelby', 'Ryan', 'Craig', 'Tara', 'Katie'];
const DEFAULT_TAGS = ['Figma', 'Prototype', 'Resource'];

async function ensureTable() {
  if (ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS prototypes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      author TEXT NOT NULL,
      image_url TEXT,
      link TEXT,
      description TEXT,
      pinned BOOLEAN NOT NULL DEFAULT false,
      type TEXT NOT NULL DEFAULT 'Prototype',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE prototypes ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE prototypes ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Prototype'`;
  await sql`ALTER TABLE prototypes ADD COLUMN IF NOT EXISTS sort_order DOUBLE PRECISION NOT NULL DEFAULT 0`;
  await sql`UPDATE prototypes SET sort_order = -extract(epoch from created_at) WHERE sort_order = 0`;
  ready = true;
}

async function ensureSettings() {
  if (settingsReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT PRIMARY KEY DEFAULT 1,
      authors JSONB NOT NULL DEFAULT '[]',
      tags JSONB NOT NULL DEFAULT '[]'
    )
  `;
  await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS author_photos JSONB NOT NULL DEFAULT '{}'`;
  await sql`
    INSERT INTO app_settings (id, authors, tags)
    VALUES (1, ${JSON.stringify(DEFAULT_AUTHORS)}, ${JSON.stringify(DEFAULT_TAGS)})
    ON CONFLICT (id) DO NOTHING
  `;
  settingsReady = true;
}

async function getSettings() {
  await ensureSettings();
  const { rows } = await sql`SELECT authors, tags, author_photos FROM app_settings WHERE id = 1`;
  const row = rows[0] || {};
  return {
    authors: row.authors || DEFAULT_AUTHORS,
    tags: row.tags || DEFAULT_TAGS,
    authorPhotos: row.author_photos || {},
  };
}

async function updateSettings({ authors, tags, authorPhotos }) {
  await ensureSettings();
  if (authors) await sql`UPDATE app_settings SET authors = ${JSON.stringify(authors)} WHERE id = 1`;
  if (tags) await sql`UPDATE app_settings SET tags = ${JSON.stringify(tags)} WHERE id = 1`;
  if (authorPhotos) await sql`UPDATE app_settings SET author_photos = ${JSON.stringify(authorPhotos)} WHERE id = 1`;
  return getSettings();
}

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    imageUrl: row.image_url || '',
    link: row.link || '',
    description: row.description || '',
    pinned: !!row.pinned,
    type: row.type || 'Prototype',
    createdAt: row.created_at,
  };
}

module.exports = { sql, ensureTable, toClient, getSettings, updateSettings };
