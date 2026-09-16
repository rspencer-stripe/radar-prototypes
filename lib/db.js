const { sql } = require('@vercel/postgres');

let ready = false;

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
  ready = true;
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

module.exports = { sql, ensureTable, toClient };
