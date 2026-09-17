const { sql, ensureTable } = require('../lib/db');

module.exports = async (req, res) => {
  await ensureTable();

  if (req.method === 'PUT') {
    const { oldTag, newTag } = req.body || {};
    if (!oldTag || !newTag) {
      res.status(400).json({ error: 'oldTag and newTag are required' });
      return;
    }
    await sql`UPDATE prototypes SET type = ${newTag} WHERE type = ${oldTag}`;
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const { tag, fallback } = req.body || {};
    if (!tag) {
      res.status(400).json({ error: 'tag is required' });
      return;
    }
    await sql`UPDATE prototypes SET type = ${fallback || 'Prototype'} WHERE type = ${tag}`;
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};
