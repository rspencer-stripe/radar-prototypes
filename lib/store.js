const { put, list, del } = require('@vercel/blob');

// Versioned JSON documents, read-modify-write, last write wins — no locking.
// Fine for this team's edit volume; would need real concurrency control at higher write rates.
//
// Each write goes to a brand-new pathname (never overwritten) because Vercel Blob's
// public CDN caches by pathname regardless of query string — overwriting the same
// path and re-fetching it can serve stale bytes indefinitely. A fresh path per write
// is always a cache miss, so reads are always correct. Old versions are deleted
// right after a successful write.
const STORE_PREFIX = 'radar-data/store-';

const DEFAULT_AUTHORS = ['Anne', 'Shelby', 'Ryan', 'Craig', 'Tara', 'Katie'];
const DEFAULT_TAGS = ['Figma', 'Prototype', 'Resource'];

function emptyStore() {
  return {
    nextId: 1,
    prototypes: [],
    authors: DEFAULT_AUTHORS,
    tags: DEFAULT_TAGS,
    authorPhotos: {},
  };
}

async function listVersions() {
  const { blobs } = await list({ prefix: STORE_PREFIX });
  return blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
}

async function readStore() {
  const [latest] = await listVersions();
  if (!latest) return emptyStore();
  const res = await fetch(latest.url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!res.ok) return emptyStore();
  const data = await res.json();
  return { ...emptyStore(), ...data };
}

async function writeStore(data) {
  const pathname = `${STORE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  await put(pathname, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
  // List again after the write (not before) so a concurrent writer's own
  // fresh blob is never swept up as "previous" — only truly stale versions
  // that predate this write get deleted.
  const stale = (await listVersions()).filter((b) => b.pathname !== pathname);
  if (stale.length) await del(stale.map((b) => b.url));
  return data;
}

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    imageUrl: row.imageUrl || '',
    link: row.link || '',
    description: row.description || '',
    pinned: !!row.pinned,
    type: row.type || 'Prototype',
    createdAt: row.createdAt,
  };
}

async function listPrototypes() {
  const store = await readStore();
  const sorted = [...store.prototypes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.sortOrder - b.sortOrder
  );
  return sorted.map(toClient);
}

async function createPrototype({ name, author, imageUrl, link, description, type }) {
  const store = await readStore();
  const row = {
    id: store.nextId,
    name,
    author,
    imageUrl: imageUrl || '',
    link: link || '',
    description: description || '',
    pinned: false,
    type: type || 'Prototype',
    sortOrder: -Date.now(),
    createdAt: new Date().toISOString(),
  };
  store.nextId += 1;
  store.prototypes.push(row);
  await writeStore(store);
  return toClient(row);
}

async function updatePrototype(id, fields) {
  const store = await readStore();
  const index = store.prototypes.findIndex((p) => String(p.id) === String(id));
  if (index === -1) return null;
  const existing = store.prototypes[index];
  const updated = {
    ...existing,
    name: fields.name ?? existing.name,
    author: fields.author ?? existing.author,
    imageUrl: fields.imageUrl ?? existing.imageUrl,
    link: fields.link ?? existing.link,
    description: fields.description ?? existing.description,
    pinned: fields.pinned ?? existing.pinned,
    type: fields.type ?? existing.type,
  };
  store.prototypes[index] = updated;
  await writeStore(store);
  return toClient(updated);
}

async function deletePrototype(id) {
  const store = await readStore();
  store.prototypes = store.prototypes.filter((p) => String(p.id) !== String(id));
  await writeStore(store);
}

async function getPrototype(id) {
  const store = await readStore();
  const row = store.prototypes.find((p) => String(p.id) === String(id));
  return row ? toClient(row) : null;
}

async function reorderPrototypes(ids) {
  const store = await readStore();
  const orderIndex = new Map(ids.map((id, i) => [String(id), i]));
  for (const p of store.prototypes) {
    if (orderIndex.has(String(p.id))) p.sortOrder = orderIndex.get(String(p.id));
  }
  await writeStore(store);
  return listPrototypes();
}

async function renameTag(oldTag, newTag) {
  const store = await readStore();
  for (const p of store.prototypes) {
    if (p.type === oldTag) p.type = newTag;
  }
  await writeStore(store);
}

async function reassignTag(tag, fallback) {
  const store = await readStore();
  for (const p of store.prototypes) {
    if (p.type === tag) p.type = fallback || 'Prototype';
  }
  await writeStore(store);
}

async function getSettings() {
  const store = await readStore();
  return {
    authors: store.authors || DEFAULT_AUTHORS,
    tags: store.tags || DEFAULT_TAGS,
    authorPhotos: store.authorPhotos || {},
  };
}

async function updateSettings({ authors, tags, authorPhotos }) {
  const store = await readStore();
  if (authors) store.authors = authors;
  if (tags) store.tags = tags;
  if (authorPhotos) store.authorPhotos = authorPhotos;
  await writeStore(store);
  return getSettings();
}

module.exports = {
  listPrototypes,
  createPrototype,
  updatePrototype,
  deletePrototype,
  getPrototype,
  reorderPrototypes,
  renameTag,
  reassignTag,
  getSettings,
  updateSettings,
  readStore,
  writeStore,
};
