const { sql, ensureTable } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { oldTag, newTag } = req.body || {};
  if (!oldTag || !newTag) {
    res.status(400).json({ error: 'oldTag and newTag are required' });
    return;
  }

  await ensureTable();
  await sql`UPDATE prototypes SET type = ${newTag} WHERE type = ${oldTag}`;
  res.status(200).json({ ok: true });
};
